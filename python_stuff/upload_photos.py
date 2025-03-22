import os
from datetime import datetime
from minio import Minio
from minio.error import S3Error
from PIL import Image
import io
import hashlib
from dotenv import load_dotenv
from tqdm import tqdm
import tempfile
import mimetypes
import json
import argparse
from typing import Tuple

from utils import get_exif_date
from utils import convert_heic_to_jpeg
from utils import get_content_type
from utils import create_video_thumbnail
from utils import validate_video_file
from utils import validate_image_file
from utils import get_video_metadata

# Load environment variables
load_dotenv("../.env")

# MinIO configuration from environment variables
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
BUCKET_NAME = "pepper-photos"

# File paths
PHOTOS_DIR = "../dog_images"

# Supported file extensions
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".heic", ".heif")
VIDEO_EXTENSIONS = (".mp4", ".mov", ".avi", ".m4v")
SKIP_FILES = (".ds_store", "thumbs.db")

# Format conversion settings
CONVERT_HEIC = True  # Convert HEIC to JPEG
WEB_IMAGE_FORMAT = "JPEG"  # Target format for web images
WEB_IMAGE_QUALITY = 85  # Quality for web images
SKIP_VIDEO_THUMBNAILS = False  # Skip video thumbnail creation

# Maximum file size and duration limits
MAX_VIDEO_SIZE_MB = 10  # Maximum video size in MB
MAX_VIDEO_DURATION_SECONDS = 5  # Maximum video duration in seconds


def setup_minio_client():
    """Setup and return MinIO client"""
    # Remove http:// or https:// from endpoint if present
    endpoint = MINIO_ENDPOINT
    secure = False

    if endpoint.startswith("https://"):
        endpoint = endpoint.replace("https://", "")
        secure = True
    elif endpoint.startswith("http://"):
        endpoint = endpoint.replace("http://", "")

    return Minio(
        endpoint,
        access_key=MINIO_ACCESS_KEY,
        secret_key=MINIO_SECRET_KEY,
        secure=secure,
    )


def ensure_bucket_exists(minio_client):
    """Create bucket if it doesn't exist"""
    try:
        if not minio_client.bucket_exists(BUCKET_NAME):
            minio_client.make_bucket(BUCKET_NAME)
            print(f"Created bucket {BUCKET_NAME}")
        else:
            print(f"Bucket {BUCKET_NAME} exists")
    except S3Error as e:
        print(f"Error checking/creating bucket: {e}")


def create_thumbnail(file_path):
    """Create a thumbnail for an image or video"""
    if any(file_path.lower().endswith(ext) for ext in VIDEO_EXTENSIONS):
        if SKIP_VIDEO_THUMBNAILS:
            print("Skipping video thumbnail (disabled)")
            return None
        return create_video_thumbnail(file_path)
    elif file_path.lower().endswith((".heic", ".heif")) and CONVERT_HEIC:
        # Convert HEIC to JPEG first, then create thumbnail
        jpeg_buffer = convert_heic_to_jpeg(file_path, WEB_IMAGE_QUALITY)
        if jpeg_buffer:
            try:
                image = Image.open(jpeg_buffer)
                image.thumbnail((300, 300))
                thumbnail_buffer = io.BytesIO()
                image.save(thumbnail_buffer, format="JPEG", quality=WEB_IMAGE_QUALITY)
                thumbnail_buffer.seek(0)
                return thumbnail_buffer
            except Exception as e:
                print(f"Error creating thumbnail from HEIC {file_path}: {e}")
                return None
        return None
    else:
        try:
            image = Image.open(file_path)
            image.thumbnail((300, 300))
            thumbnail_buffer = io.BytesIO()
            # Save as JPEG for web compatibility
            if image.format == "PNG" and image.mode == "RGBA":
                # Handle transparent PNGs
                image.save(thumbnail_buffer, format="PNG")
            else:
                image.save(
                    thumbnail_buffer, format=WEB_IMAGE_FORMAT, quality=WEB_IMAGE_QUALITY
                )
            thumbnail_buffer.seek(0)
            return thumbnail_buffer
        except Exception as e:
            print(f"Error creating thumbnail for {file_path}: {e}")
            return None


def generate_manifest(minio_client):
    """
    Generate a manifest.json file containing metadata for all photos in the bucket.
    The manifest includes:
    - List of all photos with metadata (id, path, year, month, filename)
    - Timeline data with photo counts by year
    """
    print("Generating manifest file...")

    try:
        # List all objects in the media directory
        photos = []
        objects = minio_client.list_objects(
            BUCKET_NAME, prefix="media/", recursive=True
        )

        # Process each object
        for obj in objects:
            # Parse path components
            path_parts = obj.object_name.split("/")
            if len(path_parts) >= 4:  # media/YEAR/MONTH/FILENAME
                try:
                    year = int(path_parts[1])
                    month = int(path_parts[2])
                    filename = path_parts[3]

                    # Create photo entry
                    photo = {
                        "id": obj.object_name,
                        "path": obj.object_name,
                        "year": year,
                        "month": month,
                        "filename": filename,
                        "size": obj.size,
                        "last_modified": obj.last_modified.isoformat()
                        if hasattr(obj, "last_modified")
                        else None,
                    }

                    photos.append(photo)
                except (ValueError, IndexError) as e:
                    print(f"Error parsing path {obj.object_name}: {e}")

        # Sort photos by year and month (newest first)
        photos.sort(key=lambda p: (p["year"], p["month"]), reverse=True)

        # Generate timeline data (photo counts by year)
        year_counts = {}
        for photo in photos:
            year = photo["year"]
            year_counts[year] = year_counts.get(year, 0) + 1

        timeline = [
            {"year": year, "count": count} for year, count in year_counts.items()
        ]
        timeline.sort(key=lambda x: x["year"])

        # Create the manifest
        manifest = {
            "photos": photos,
            "timeline": timeline,
            "generated_at": datetime.now().isoformat(),
            "total_photos": len(photos),
        }

        # Save manifest to a temporary file
        with tempfile.NamedTemporaryFile(
            mode="w", suffix=".json", delete=False
        ) as temp_file:
            json.dump(manifest, temp_file, indent=2)
            temp_file_path = temp_file.name

        # Upload manifest to Minio
        print(f"Uploading manifest with metadata for {len(photos)} photos...")
        minio_client.fput_object(
            BUCKET_NAME,
            "manifest.json",
            temp_file_path,
            content_type="application/json",
        )

        # Clean up temporary file
        os.unlink(temp_file_path)

        print(f"✓ Manifest uploaded successfully")
        return True

    except Exception as e:
        print(f"Error generating manifest: {e}")
        return False


def upload_photos(photos_dir: str, dry_run=False):
    """Upload photos and videos to MinIO with year/month structure"""
    if dry_run:
        print(f"DRY RUN: Testing media processing from {photos_dir} (no uploads will occur)")
    else:
        print(f"Uploading media from {photos_dir} to MinIO")
        
    minio_client = None
    if not dry_run:
        minio_client = setup_minio_client()
        ensure_bucket_exists(minio_client)

    # Initialize mimetypes
    mimetypes.init()

    # First, collect all eligible files
    eligible_files = []
    for root, _, files in os.walk(photos_dir):
        for file in files:
            file_lower = file.lower()
            if (
                any(file_lower.endswith(ext) for ext in IMAGE_EXTENSIONS)
                or any(file_lower.endswith(ext) for ext in VIDEO_EXTENSIONS)
            ) and not any(file_lower.endswith(skip) for skip in SKIP_FILES):
                eligible_files.append(os.path.join(root, file))

    total_files = len(eligible_files)
    if total_files == 0:
        print("No media files found to upload")
        return

    # Calculate total size for better progress tracking
    total_size = sum(os.path.getsize(f) for f in eligible_files)

    # Process files with progress bar
    print(
        f"Found {total_files} media files to process (Total: {total_size / (1024*1024):.2f} MB)"
    )
    processed_count = 0
    processed_size = 0
    error_files = []

    # Create progress bar for overall progress
    main_progress = tqdm(
        total=total_size, desc="Overall progress", unit="B", unit_scale=True
    )

    for file_path in eligible_files:
        file_name = os.path.basename(file_path)
        file_lower = file_name.lower()
        file_size = os.path.getsize(file_path)

        # Update progress description with current file
        action = "Testing" if dry_run else "Uploading"
        main_progress.set_description(
            f"{action} {file_name} ({file_size / (1024*1024):.2f} MB)"
        )

        try:
            start_time = datetime.now()

            # Get year and month from metadata
            try:
                year, month = get_exif_date(
                    file_path, VIDEO_EXTENSIONS, IMAGE_EXTENSIONS
                )
            except Exception as e:
                error_msg = f"Error getting date from {file_path}: {e}"
                print(error_msg)
                error_files.append((file_path, error_msg))
                continue

            # Generate a unique filename based on content hash
            file_hash = hashlib.md5(open(file_path, "rb").read()).hexdigest()[:10]

            # Process based on file type
            is_heic = any(file_lower.endswith(ext) for ext in (".heic", ".heif"))
            is_video = any(file_lower.endswith(ext) for ext in VIDEO_EXTENSIONS)

            # Validate video files before processing
            if is_video:
                is_valid, validation_msg = validate_video_file(file_path)
                
                # Check if video exceeds size or duration limits
                if is_valid:
                    duration, size_mb = get_video_metadata(file_path)
                    if duration is not None and duration > MAX_VIDEO_DURATION_SECONDS:
                        is_valid = False
                        validation_msg = f"Video too long: {duration:.2f}s (max {MAX_VIDEO_DURATION_SECONDS}s)"
                    
                    if size_mb is not None and size_mb > MAX_VIDEO_SIZE_MB:
                        is_valid = False
                        validation_msg = f"Video too large: {size_mb:.2f}MB (max {MAX_VIDEO_SIZE_MB}MB)"
                
                if not is_valid:
                    error_msg = f"Invalid video file: {validation_msg}"
                    print(f"  - {file_name}: {error_msg}")
                    error_files.append((file_path, error_msg))
                    # Skip to next file if video is invalid
                    if dry_run:
                        main_progress.update(file_size)
                        continue

            # MAIN MEDIA UPLOAD - Use a single "media" directory
            if is_heic and CONVERT_HEIC:
                # For HEIC, convert to JPEG for web viewing
                jpeg_buffer = convert_heic_to_jpeg(file_path, WEB_IMAGE_QUALITY)
                if jpeg_buffer:
                    media_key = f"media/{year}/{month:02d}/{file_hash}.jpg"
                    media_size = jpeg_buffer.getbuffer().nbytes
                    
                    if not dry_run:
                        minio_client.put_object(
                            BUCKET_NAME,
                            media_key,
                            jpeg_buffer,
                            media_size,
                            content_type="image/jpeg",
                        )

                    # Calculate and show upload statistics
                    elapsed = (datetime.now() - start_time).total_seconds()
                    speed = media_size / (1024 * 1024 * elapsed) if elapsed > 0 else 0
                else:
                    error_msg = f"Failed to convert HEIC file: {file_path}"
                    print(error_msg)
                    error_files.append((file_path, error_msg))
            else:
                # For other files, upload directly
                ext = os.path.splitext(file_name)[1].lower()
                if is_video:
                    media_key = f"media/{year}/{month:02d}/{file_hash}{ext}"
                else:
                    # For regular images, keep extension but ensure lowercase
                    media_key = f"media/{year}/{month:02d}/{file_hash}{ext}"

                # Get content type
                content_type = get_content_type(
                    file_path, VIDEO_EXTENSIONS, IMAGE_EXTENSIONS
                )

                # Upload with progress tracking
                if not dry_run:
                    minio_client.fput_object(
                        BUCKET_NAME, media_key, file_path, content_type=content_type
                    )

                # Calculate and show upload statistics
                elapsed = (datetime.now() - start_time).total_seconds()
                speed = file_size / (1024 * 1024 * elapsed) if elapsed > 0 else 0

            # Create and upload thumbnail (regardless of type)
            try:
                # Skip thumbnail creation if video validation failed
                if is_video and 'validation_msg' in locals() and not is_valid:
                    error_msg = f"Skipping thumbnail creation for invalid video: {validation_msg}"
                    print(f"  - {file_name}: {error_msg}")
                    error_files.append((file_path, error_msg))
                # Validate images before thumbnail creation
                elif not is_video and not is_heic:
                    is_valid_img, img_msg = validate_image_file(file_path)
                    if not is_valid_img:
                        error_msg = f"Skipping thumbnail creation for invalid image: {img_msg}"
                        print(f"  - {file_name}: {error_msg}")
                        error_files.append((file_path, error_msg))
                        # Skip to next file
                        if dry_run:
                            continue
                else:
                    thumb_buffer = create_thumbnail(file_path)
                    if thumb_buffer:
                        thumbnail_key = f"thumbnails/{year}/{month:02d}/{file_hash}.jpg"
                        thumb_size = thumb_buffer.getbuffer().nbytes
                        
                        if not dry_run:
                            minio_client.put_object(
                                BUCKET_NAME,
                                thumbnail_key,
                                thumb_buffer,
                                thumb_size,
                                content_type="image/jpeg",
                            )
                    else:
                        error_msg = f"Thumbnail creation failed - skipping"
                        print(f"  - {file_name}: {error_msg}")
                        error_files.append((file_path, error_msg))
            except Exception as e:
                error_msg = f"Error processing thumbnail: {e} - skipping"
                print(f"  - {file_name}: {error_msg}")
                error_files.append((file_path, error_msg))

            processed_count += 1
            processed_size += file_size
            main_progress.update(file_size)

        except Exception as e:
            error_msg = f"Error processing {file_name}: {e}"
            print(f"\n{error_msg}")
            error_files.append((file_path, error_msg))

    main_progress.close()
    
    if dry_run:
        print(f"Dry run completed: Processed {processed_count} of {total_files} media files")
        if error_files:
            print(f"\nFound {len(error_files)} files with errors:")
            for path, error in error_files:
                print(f"  - {os.path.basename(path)}: {error}")
        else:
            print("No errors found. All files should upload successfully.")
    else:
        print(f"Uploaded {processed_count} of {total_files} media files to MinIO")
        print(f"Total data transferred: {processed_size / (1024*1024):.2f} MB")

        # Generate and upload the manifest file
        generate_manifest(minio_client)


def validate_image_file(file_path: str) -> Tuple[bool, str]:
    """
    Validate an image file to check if it can be processed correctly.
    
    Args:
        file_path: Path to the image file
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        img = Image.open(file_path)
        width, height = img.size
        
        # Check for invalid dimensions
        if width <= 0 or height <= 0:
            return False, f"Invalid image dimensions: {width}x{height}"
            
        return True, f"Valid image: {width}x{height}"
    except Exception as e:
        return False, f"Error validating image: {e.__class__.__name__}: {e}"


if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Upload photos to MinIO with organization"
    )
    parser.add_argument(
        "--dir", type=str, default=PHOTOS_DIR, help="Directory containing photos"
    )
    parser.add_argument(
        "--skip-video-thumbnails",
        action="store_true",
        help="Skip video thumbnail creation",
    )
    parser.add_argument(
        "--manifest-only",
        action="store_true",
        help="Only generate manifest without uploading photos",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Test processing without uploading (identify problem files)",
    )
    args = parser.parse_args()

    # Set global options from command line
    SKIP_VIDEO_THUMBNAILS = args.skip_video_thumbnails

    # Run the upload or just generate manifest
    if args.manifest_only:
        minio_client = setup_minio_client()
        ensure_bucket_exists(minio_client)
        generate_manifest(minio_client)
    else:
        upload_photos(args.dir, dry_run=args.dry_run)
