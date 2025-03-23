import os
from datetime import datetime
from minio import Minio
from minio.error import S3Error
from PIL import Image
from PIL.ExifTags import TAGS
import io
import hashlib
from dotenv import load_dotenv
from tqdm import tqdm
import tempfile
import mimetypes
import json
import argparse
from typing import Tuple, List, Dict, Any
import concurrent.futures
from functools import partial
import threading
from multiprocessing import cpu_count
from concurrent.futures import ProcessPoolExecutor
import imagehash
import pillow_heif

# Import utility functions
from utils import get_exif_date
from utils import convert_heic_to_jpeg
from utils import get_content_type
from utils import create_video_thumbnail
from utils import validate_video_file
from utils import validate_image_file
from utils import get_video_metadata

# Load environment variables
load_dotenv(".env")

# MinIO configuration from environment variables
assert os.getenv("MINIO_ENDPOINT") is not None, "MINIO_ENDPOINT is not set"
assert os.getenv("MINIO_ACCESS_KEY") is not None, "MINIO_ACCESS_KEY is not set"
assert os.getenv("MINIO_SECRET_KEY") is not None, "MINIO_SECRET_KEY is not set"
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT")
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
WEB_IMAGE_FORMAT = "WEBP"  # Target format for web images
WEB_IMAGE_QUALITY = 85  # Quality for web images
SKIP_VIDEO_THUMBNAILS = False  # Skip video thumbnail creation

# Image optimization settings
MAIN_IMAGE_SIZE = (1920, 1080)  # 2x Retina resolution
MAIN_IMAGE_FORMAT = "WEBP"  # Modern format for better compression
MAIN_IMAGE_QUALITY = 85  # High quality for main images

# Maximum file size and duration limits
MAX_VIDEO_SIZE_MB = 10  # Maximum video size in MB
MAX_VIDEO_DURATION_SECONDS = 5  # Maximum video duration in seconds

# Parallelization settings
MAX_WORKERS_PROCESS = max(os.cpu_count() - 1, 1)  # Leave one CPU free
MAX_WORKERS_THREAD = 10  # Concurrent uploads
BATCH_SIZE = 10  # Process files in batches

# Thread-local storage for MinIO clients
local_minio_clients = threading.local()


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


def get_minio_client():
    """Get thread-local MinIO client"""
    if not hasattr(local_minio_clients, "client"):
        local_minio_clients.client = setup_minio_client()
    return local_minio_clients.client


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
    # Smaller thumbnail dimensions - aligned with display size
    THUMBNAIL_SIZE = (80, 100)
    THUMBNAIL_QUALITY = 70  # Lower quality is fine for small thumbnails
    THUMBNAIL_FORMAT = "WEBP"  # WebP format for better compression
    
    if any(file_path.lower().endswith(ext) for ext in VIDEO_EXTENSIONS):
        if SKIP_VIDEO_THUMBNAILS:
            print("Skipping video thumbnail (disabled)")
            return None
        return create_video_thumbnail(file_path, size=THUMBNAIL_SIZE)
    elif file_path.lower().endswith((".heic", ".heif")) and CONVERT_HEIC:
        # Convert HEIC to JPEG first, then create thumbnail
        jpeg_buffer = convert_heic_to_jpeg(file_path, WEB_IMAGE_QUALITY)
        if jpeg_buffer:
            try:
                image = Image.open(jpeg_buffer)
                # Apply orientation correction
                image = apply_exif_orientation(image)
                image.thumbnail(THUMBNAIL_SIZE)
                thumbnail_buffer = io.BytesIO()
                image.save(thumbnail_buffer, format=THUMBNAIL_FORMAT, quality=THUMBNAIL_QUALITY)
                thumbnail_buffer.seek(0)
                return thumbnail_buffer
            except Exception as e:
                print(f"Error creating thumbnail from HEIC {file_path}: {e}")
                return None
        return None
    else:
        try:
            image = Image.open(file_path)
            # Apply orientation correction
            image = apply_exif_orientation(image)
            image.thumbnail(THUMBNAIL_SIZE)
            thumbnail_buffer = io.BytesIO()
            # Save as WebP for better compression and web compatibility
            if image.format == "PNG" and image.mode == "RGBA":
                # For transparent images, WebP also supports transparency
                image.save(thumbnail_buffer, format=THUMBNAIL_FORMAT)
            else:
                image.save(
                    thumbnail_buffer, format=THUMBNAIL_FORMAT, quality=THUMBNAIL_QUALITY
                )
            thumbnail_buffer.seek(0)
            return thumbnail_buffer
        except Exception as e:
            print(f"Error creating thumbnail for {file_path}: {e}")
            return None


def apply_exif_orientation(image):
    """Apply the EXIF orientation to the image"""
    try:
        exif = image._getexif()
        if exif is None:
            return image
            
        orientation_key = next((key for key, value in TAGS.items() if value == 'Orientation'), None)
        if orientation_key is None or orientation_key not in exif:
            return image
            
        orientation = exif[orientation_key]
        
        # Orientation values and their corresponding transformations:
        # 1: Normal (no rotation, no flip)
        # 2: Mirrored horizontally
        # 3: Rotated 180 degrees
        # 4: Mirrored vertically
        # 5: Mirrored horizontally and rotated 90 degrees counter-clockwise
        # 6: Rotated 90 degrees counter-clockwise
        # 7: Mirrored horizontally and rotated 90 degrees clockwise
        # 8: Rotated 90 degrees clockwise
        
        if orientation == 1:
            return image
        elif orientation == 2:
            return image.transpose(Image.FLIP_LEFT_RIGHT)
        elif orientation == 3:
            return image.transpose(Image.ROTATE_180)
        elif orientation == 4:
            return image.transpose(Image.FLIP_TOP_BOTTOM)
        elif orientation == 5:
            return image.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.ROTATE_90)
        elif orientation == 6:
            return image.transpose(Image.ROTATE_270)
        elif orientation == 7:
            return image.transpose(Image.FLIP_LEFT_RIGHT).transpose(Image.ROTATE_270)
        elif orientation == 8:
            return image.transpose(Image.ROTATE_90)
        return image
    except Exception as e:
        print(f"Error applying EXIF orientation: {e}")
        return image


def process_file(file_path: str, dry_run: bool = False) -> Dict[str, Any]:
    """Process a single media file completely (thumbnailing and uploading)"""
    file_name = os.path.basename(file_path)
    file_lower = file_name.lower()
    result = {
        "file_path": file_path, 
        "file_name": file_name,
        "file_size": 0,
        "success": False,
        "error": None
    }
    
    # Validate file exists
    if not os.path.exists(file_path):
        result["error"] = f"File not found: {file_path}"
        return result
    
    # Get file size only after confirming it exists
    file_size = os.path.getsize(file_path)
    result["file_size"] = file_size

    try:
        # Get year and month from metadata
        try:
            year, month = get_exif_date(file_path, VIDEO_EXTENSIONS, IMAGE_EXTENSIONS)
        except Exception as e:
            result["error"] = f"Error getting date: {e}"
            return result

        # Generate a unique filename based on content hash
        with open(file_path, "rb") as f:
            file_hash = hashlib.md5(f.read()).hexdigest()[:10]

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
                result["error"] = f"Invalid video: {validation_msg}"
                return result
                
        # Validate image files
        elif not is_video:
            # Validate non-HEIC images (HEIC gets special handling during conversion)
            if not is_heic:
                is_valid_img, img_msg = validate_image_file(file_path)
                if not is_valid_img:
                    result["error"] = f"Invalid image: {img_msg}"
                    return result

        # Get the thread-local MinIO client if needed
        minio_client = None if dry_run else get_minio_client()

        # MAIN MEDIA UPLOAD - Process based on file type
        if is_video:
            # For videos, upload directly
            ext = os.path.splitext(file_name)[1].lower()
            media_key = f"media/{year}/{month:02d}/{file_hash}{ext}"
            
            if not dry_run:
                minio_client.fput_object(
                    BUCKET_NAME, media_key, file_path, content_type=get_content_type(file_path, VIDEO_EXTENSIONS, IMAGE_EXTENSIONS)
                )
        else:
            # For images, create optimized version
            main_buffer = create_main_image(file_path)
            if main_buffer:
                media_key = f"media/{year}/{month:02d}/{file_hash}.webp"
                media_size = main_buffer.getbuffer().nbytes
                
                if not dry_run:
                    minio_client.put_object(
                        BUCKET_NAME,
                        media_key,
                        main_buffer,
                        media_size,
                        content_type="image/webp",
                    )
            else:
                result["error"] = "Failed to create optimized image"
                return result

        # Create and upload thumbnail
        # Skip thumbnail creation if video validation failed or image is invalid
        if is_video and (not is_valid):
            result["error"] = "Skipping thumbnail for invalid video"
            return result

        # Create thumbnail
        thumb_buffer = create_thumbnail(file_path)
        if thumb_buffer:
            thumbnail_key = f"thumbnails/{year}/{month:02d}/{file_hash}.webp"
            thumb_size = thumb_buffer.getbuffer().nbytes
            
            if not dry_run:
                minio_client.put_object(
                    BUCKET_NAME,
                    thumbnail_key,
                    thumb_buffer,
                    thumb_size,
                    content_type="image/webp",
                )
        else:
            result["error"] = "Thumbnail creation failed"
            return result

        result["success"] = True
        return result

    except Exception as e:
        result["error"] = f"Error: {e.__class__.__name__}: {e}"
        return result


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

        # Sort photos by year and month (oldest first)
        photos.sort(key=lambda p: (p["year"], p["month"]), reverse=False)

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

        print("✓ Manifest uploaded successfully")
        return True

    except Exception as e:
        print(f"Error generating manifest: {e}")
        return False


def upload_photos(photos_dir: str, dry_run=False, dedupe=False, threshold=5, skip_invalid=True):
    """Upload photos and videos to MinIO with year/month structure using parallel processing"""
    if dry_run:
        print(f"DRY RUN: Testing media processing from {photos_dir} (no uploads will occur)")
    else:
        print(f"Uploading media from {photos_dir} to MinIO using {MAX_WORKERS_PROCESS} processes and {MAX_WORKERS_THREAD} threads")
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

    # Apply deduplication if enabled
    if dedupe:
        print(f"Applying deduplication with threshold {threshold}...")
        
        # Separate images and videos
        image_files = [f for f in eligible_files if any(f.lower().endswith(ext) for ext in IMAGE_EXTENSIONS)]
        video_files = [f for f in eligible_files if any(f.lower().endswith(ext) for ext in VIDEO_EXTENSIONS)]
        
        # Only deduplicate images, keep all videos
        unique_images = filter_duplicates(image_files, threshold, skip_invalid)
        
        # Record original count for reporting
        original_count = len(eligible_files)
        
        # Combine unique images with all videos
        eligible_files = unique_images + video_files
        
        print(f"After deduplication: {len(eligible_files)} of {original_count} files will be processed")

    total_files = len(eligible_files)
    if total_files == 0:
        print("No media files found to upload")
        return

    # Calculate total size for progress tracking
    total_size = sum(os.path.getsize(f) for f in eligible_files)
    print(f"Found {total_files} media files to process (Total: {total_size / (1024*1024):.2f} MB)")

    # Create progress bar for overall progress
    progress_bar = tqdm(total=total_size, desc="Overall progress", unit="B", unit_scale=True)
    
    # Process files in parallel
    results = []
    error_files = []
    
    # Create a partial function with dry_run parameter
    process_file_with_dryrun = partial(process_file, dry_run=dry_run)
    
    # Use ProcessPoolExecutor for CPU-bound processing (thumbnails, image processing)
    with concurrent.futures.ProcessPoolExecutor(max_workers=MAX_WORKERS_PROCESS) as executor:
        # Process files in parallel
        future_to_file = {executor.submit(process_file_with_dryrun, file_path): file_path for file_path in eligible_files}
        
        for future in concurrent.futures.as_completed(future_to_file):
            file_path = future_to_file[future]
            file_size = os.path.getsize(file_path)
            
            try:
                result = future.result()
                results.append(result)
                
                if result.get("error"):
                    error_files.append((file_path, result["error"]))
                
                # Update progress bar
                progress_bar.update(file_size)
                
            except Exception as e:
                error_files.append((file_path, f"Processing error: {e}"))
                progress_bar.update(file_size)

    progress_bar.close()
    
    # Calculate success statistics
    success_count = sum(1 for r in results if r.get("success", False))
    processed_size = sum(r.get("file_size", 0) for r in results if r.get("success", False))
    
    if dry_run:
        print(f"Dry run completed: Successfully processed {success_count} of {total_files} media files")
    else:
        print(f"Uploaded {success_count} of {total_files} media files to MinIO")
        print(f"Total data transferred: {processed_size / (1024*1024):.2f} MB")

    # Report errors
    if error_files:
        print(f"\nFound {len(error_files)} files with errors:")
        for path, error in error_files:
            print(f"  - {os.path.basename(path)}: {error}")
    else:
        print("No errors found. All files processed successfully.")

    # Generate and upload the manifest file
    if not dry_run and success_count > 0:
        generate_manifest(get_minio_client())



def filter_duplicates(image_files: List[str], threshold: int = 5, skip_invalid: bool = True) -> List[str]:
    """
    Filter out duplicate images using perceptual hashing.
    """
    print(f"Finding duplicate images with threshold {threshold}...")
    
    if not image_files:
        return []
    
    # Compute hashes for all images
    print("Computing image hashes...")
    hash_dict = {}
    
    # Create a mapping of files to results for easier failure detection
    file_to_result = {}
    for i, file_path in enumerate(image_files):
        file_to_result[file_path] = None
    
    # Use multiprocessing for hash computation
    num_workers = max(1, cpu_count() - 1)  # Leave one CPU free
    with ProcessPoolExecutor(max_workers=num_workers) as executor:
        # Use a dict to track which future corresponds to which file
        future_to_file = {executor.submit(compute_image_hash, file_path): file_path 
                         for file_path in image_files}
        
        # Process results as they complete
        for future in tqdm(
            concurrent.futures.as_completed(future_to_file), 
            total=len(image_files),
            desc="Hashing images",
            unit="img"
        ):
            file_path = future_to_file[future]
            try:
                result = future.result()
                file_to_result[file_path] = result
                
                if result is not None:
                    img_path, h_str = result
                    if h_str not in hash_dict:
                        hash_dict[h_str] = []
                    hash_dict[h_str].append(img_path)
            except Exception as e:
                print(f"Exception while processing {file_path}: {e}")
    
    # Identify files that failed to hash
    failed_files = [f for f in image_files if file_to_result[f] is None]
    
    if not hash_dict:
        print("No valid image hashes found. Returning all files as unique.")
        return image_files
    
    # Find all groups of similar images
    similar_images = []
    processed_hashes = set()
    
    for h1_str, img_list1 in tqdm(hash_dict.items(), desc="Finding duplicates", unit="hash"):
        if h1_str in processed_hashes:
            continue
            
        current_group = set(img_list1)
        processed_hashes.add(h1_str)
        
        try:
            h1 = imagehash.hex_to_hash(h1_str)
            
            # Find all similar hashes
            for h2_str, img_list2 in hash_dict.items():
                if h2_str in processed_hashes or h2_str == h1_str:
                    continue
                    
                try:
                    h2 = imagehash.hex_to_hash(h2_str)
                    if h1 - h2 <= threshold:
                        current_group.update(img_list2)
                        processed_hashes.add(h2_str)
                except Exception as e:
                    print(f"Error comparing hashes {h1_str} and {h2_str}: {e}")
                    continue
            
            if current_group:
                similar_images.append(list(current_group))
        except Exception as e:
            print(f"Error processing hash {h1_str}: {e}")
            continue
    
    # Create a set for tracking unique images to keep
    unique_images = set()
    
    # For each group, keep the oldest image
    for group in similar_images:
        if group:
            try:
                # Sort by creation time (oldest first)
                group.sort(key=lambda x: os.path.getctime(x))
                # Add the first (oldest) image to the unique set
                unique_images.add(group[0])
            except Exception as e:
                print(f"Error sorting group by creation time: {e}")
                # If sorting fails, just add the first one
                unique_images.add(group[0])
    
    # Also add images that have no duplicates (singleton groups)
    for h_str, img_list in hash_dict.items():
        if len(img_list) == 1 and not any(img_list[0] in group for group in similar_images if len(group) > 1):
            unique_images.add(img_list[0])
    
    # Add files that failed hashing based on skip_invalid flag
    if not skip_invalid:
        for file_path in failed_files:
            unique_images.add(file_path)
    else:
        print(f"Skipping {len(failed_files)} invalid/problematic images")
    
    # Print statistics
    total_images = len(image_files)
    unique_count = len(unique_images)
    duplicate_count = total_images - unique_count - (len(failed_files) if skip_invalid else 0)
    failed_count = len(failed_files)
    
    print(f"Deduplication: Found {total_images} total images")
    print(f"Deduplication: Successfully hashed {total_images - failed_count} images")
    print(f"Deduplication: Failed to hash {failed_count} images ({('skipping them' if skip_invalid else 'treating as unique')})")
    print(f"Deduplication: Keeping {unique_count} unique images")
    print(f"Deduplication: Filtered out {duplicate_count} duplicate images")
    
    return list(unique_images)


def compute_image_hash(img_path):
    """Compute perceptual hash for a single image."""
    try:
        # Register HEIF/HEIC opener in the worker process
        pillow_heif.register_heif_opener()
        
        # For HEIC files, convert to JPEG first
        if img_path.lower().endswith(('.heic', '.heif')):
            try:
                with Image.open(img_path) as img:
                    h = imagehash.phash(img)
                    return str(img_path), str(h)
            except Exception as e:
                print(f"Error processing HEIC {img_path}: {e}")
                return None
        else:
            # For regular images
            img = Image.open(img_path)
            h = imagehash.phash(img)
            return str(img_path), str(h)
    except Exception as e:
        print(f"Error processing {img_path}: {e}")
        return None


def create_main_image(file_path):
    """Create an optimized main image for gallery viewing"""
    if file_path.lower().endswith((".heic", ".heif")) and CONVERT_HEIC:
        # Convert HEIC to intermediate format first
        jpeg_buffer = convert_heic_to_jpeg(file_path, WEB_IMAGE_QUALITY)
        if jpeg_buffer:
            try:
                image = Image.open(jpeg_buffer)
                # Apply orientation correction
                image = apply_exif_orientation(image)
            except Exception as e:
                print(f"Error creating main image from HEIC {file_path}: {e}")
                return None
        else:
            return None
    else:
        try:
            image = Image.open(file_path)
            # Apply orientation correction
            image = apply_exif_orientation(image)
        except Exception as e:
            print(f"Error opening image {file_path}: {e}")
            return None

    try:
        # Calculate aspect ratio preserving resize dimensions
        aspect_ratio = image.width / image.height
        target_ratio = MAIN_IMAGE_SIZE[0] / MAIN_IMAGE_SIZE[1]
        
        if aspect_ratio > target_ratio:
            # Image is wider than target ratio
            new_width = MAIN_IMAGE_SIZE[0]
            new_height = int(new_width / aspect_ratio)
        else:
            # Image is taller than target ratio
            new_height = MAIN_IMAGE_SIZE[1]
            new_width = int(new_height * aspect_ratio)
        
        # Resize image
        image = image.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Save as WebP
        main_buffer = io.BytesIO()
        if image.mode == "RGBA":
            # Handle transparency
            image.save(main_buffer, format=MAIN_IMAGE_FORMAT, lossless=True)
        else:
            image.save(main_buffer, format=MAIN_IMAGE_FORMAT, quality=MAIN_IMAGE_QUALITY)
        
        main_buffer.seek(0)
        return main_buffer
    except Exception as e:
        print(f"Error processing main image for {file_path}: {e}")
        return None


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
    parser.add_argument(
        "--workers",
        type=int,
        default=MAX_WORKERS_PROCESS,
        help="Number of worker processes for parallel processing",
    )
    parser.add_argument(
        "--threads",
        type=int,
        default=MAX_WORKERS_THREAD,
        help="Number of upload threads per process",
    )
    parser.add_argument(
        "--dedupe",
        action="store_true",
        help="Apply deduplication to images",
    )
    parser.add_argument(
        "--threshold",
        type=int,
        default=5,
        help="Deduplication threshold for perceptual hashing",
    )
    parser.add_argument(
        "--include-invalid",
        action="store_true",
        help="Include invalid/problematic files (not recommended)",
    )
    args = parser.parse_args()

    # Set global options from command line
    SKIP_VIDEO_THUMBNAILS = args.skip_video_thumbnails
    MAX_WORKERS_PROCESS = args.workers
    MAX_WORKERS_THREAD = args.threads

    # Run the upload or just generate manifest
    if args.manifest_only:
        minio_client = setup_minio_client()
        ensure_bucket_exists(minio_client)
        generate_manifest(minio_client)
    else:
        upload_photos(args.dir, dry_run=args.dry_run, dedupe=args.dedupe, threshold=args.threshold, skip_invalid=not args.include_invalid)
