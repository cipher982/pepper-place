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
import subprocess
import tempfile
import mimetypes
import json
import re
import threading
import argparse

# Load environment variables
load_dotenv("../.env")

# MinIO configuration from environment variables
MINIO_ENDPOINT = os.getenv("MINIO_ENDPOINT", "localhost:9000")
MINIO_ACCESS_KEY = os.getenv("MINIO_ACCESS_KEY")
MINIO_SECRET_KEY = os.getenv("MINIO_SECRET_KEY")
BUCKET_NAME = os.getenv("MINIO_BUCKET_NAME")

# File paths
PHOTOS_DIR = "../dog_images_simple"

# Supported file extensions
IMAGE_EXTENSIONS = (".jpg", ".jpeg", ".png", ".heic", ".heif")
VIDEO_EXTENSIONS = (".mp4", ".mov", ".avi", ".m4v")
SKIP_FILES = (".ds_store", "thumbs.db")

# Format conversion settings
CONVERT_HEIC = True  # Convert HEIC to JPEG
WEB_IMAGE_FORMAT = "JPEG"  # Target format for web images
WEB_IMAGE_QUALITY = 85  # Quality for web images
SKIP_VIDEO_THUMBNAILS = False  # Skip video thumbnail creation


def get_exif_date(file_path):
    """Extract date from media metadata or use file modification date as fallback"""
    file_lower = file_path.lower()
    
    # For videos, use ffprobe to extract creation date
    if any(file_lower.endswith(ext) for ext in VIDEO_EXTENSIONS):
        try:
            # Try using ffprobe to get creation date
            cmd = ["ffprobe", "-v", "quiet", "-print_format", "json", 
                   "-show_entries", "format_tags=creation_time:format=filename,duration", 
                   file_path]
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)
            
            if result.returncode == 0:
                metadata = json.loads(result.stdout)
                # Try to find creation_time in tags
                if "format" in metadata and "tags" in metadata["format"] and "creation_time" in metadata["format"]["tags"]:
                    creation_time = metadata["format"]["tags"]["creation_time"]
                    # Parse ISO format date like "2023-04-15T12:30:45.000000Z"
                    date_obj = datetime.fromisoformat(creation_time.replace("Z", "+00:00"))
                    return date_obj.year, date_obj.month
            
            # Fallback to exiftool for video metadata
            return extract_date_with_exiftool(file_path)
        except Exception as e:
            print(f"Error extracting video metadata from {file_path}: {e}")
    
    # For HEIC/HEIF files, use exiftool
    elif file_lower.endswith((".heic", ".heif")):
        try:
            return extract_date_with_exiftool(file_path)
        except Exception as e:
            print(f"Error extracting HEIC metadata from {file_path}: {e}")
    
    # For regular images, try EXIF data with PIL
    else:
        try:
            image = Image.open(file_path)
            exif_data = image._getexif()

            if exif_data:
                # Try to get the date the picture was taken
                for tag_id, value in exif_data.items():
                    tag = TAGS.get(tag_id, tag_id)
                    if tag == "DateTimeOriginal":
                        # Parse EXIF date format: "YYYY:MM:DD HH:MM:SS"
                        date_obj = datetime.strptime(value, "%Y:%m:%d %H:%M:%S")
                        return date_obj.year, date_obj.month
        except Exception as e:
            print(f"Error reading EXIF from {file_path}: {e}")

    # Ultimate fallback: use file modification date
    mod_time = os.path.getmtime(file_path)
    date_obj = datetime.fromtimestamp(mod_time)
    return date_obj.year, date_obj.month


def extract_date_with_exiftool(file_path):
    """Extract creation date using exiftool as a fallback method"""
    try:
        # Common date tags to try in order of preference
        date_tags = [
            "DateTimeOriginal", 
            "CreateDate", 
            "MediaCreateDate", 
            "TrackCreateDate",
            "CreationDate"
        ]
        
        # Build exiftool command to extract these tags
        tag_args = []
        for tag in date_tags:
            tag_args.extend(["-" + tag])
            
        cmd = ["exiftool", "-j", *tag_args, file_path]
        result = subprocess.run(cmd, capture_output=True, text=True, check=False)
        
        if result.returncode == 0:
            metadata = json.loads(result.stdout)
            if metadata and isinstance(metadata, list) and len(metadata) > 0:
                # Try each date tag in order of preference
                for tag in date_tags:
                    if tag in metadata[0]:
                        date_str = metadata[0][tag]
                        # Handle various date formats
                        if ":" in date_str:
                            # Format: "YYYY:MM:DD HH:MM:SS"
                            match = re.search(r"(\d{4}):(\d{2}):\d{2}", date_str)
                            if match:
                                year, month = int(match.group(1)), int(match.group(2))
                                return year, month
    except Exception as e:
        print(f"Error extracting date with exiftool: {e}")
        
    # If exiftool fails, use file modification time
    mod_time = os.path.getmtime(file_path)
    date_obj = datetime.fromtimestamp(mod_time)
    return date_obj.year, date_obj.month


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
        secure=secure
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
        jpeg_buffer = convert_heic_to_jpeg(file_path)
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
                image.save(thumbnail_buffer, format=WEB_IMAGE_FORMAT, quality=WEB_IMAGE_QUALITY)
            thumbnail_buffer.seek(0)
            return thumbnail_buffer
        except Exception as e:
            print(f"Error creating thumbnail for {file_path}: {e}")
            return None


def convert_heic_to_jpeg(heic_path):
    """Convert HEIC to JPEG format using sips (macOS) or PIL with pillow-heif"""
    try:
        # Using macOS sips command (more reliable than Python libraries)
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=True) as temp_jpg:
            subprocess.run(["sips", "-s", "format", "jpeg", "-s", "formatOptions", str(WEB_IMAGE_QUALITY), 
                          heic_path, "--out", temp_jpg.name], check=True, capture_output=True)
            
            # Read the converted file into a buffer
            with open(temp_jpg.name, 'rb') as f:
                jpeg_data = f.read()
                buffer = io.BytesIO(jpeg_data)
                buffer.seek(0)
                return buffer
    except subprocess.CalledProcessError as e:
        print(f"Error converting HEIC using sips: {e}")
        # Could add fallback to pillow-heif here if needed
        return None
    except Exception as e:
        print(f"Error in HEIC conversion: {e}")
        return None


def create_video_thumbnail(video_path):
    """Extract a thumbnail from a video file using ffmpeg"""
    try:
        with tempfile.NamedTemporaryFile(suffix='.jpg', delete=True) as temp_jpg:            
            # Set a timeout for ffmpeg process (10 seconds)
            process = subprocess.run(
                ["ffmpeg", "-y", "-i", video_path, "-ss", "00:00:01.000", 
                 "-vframes", "1", "-vf", "scale=300:-1", temp_jpg.name],
                capture_output=True,
                text=True,
                check=False,
                timeout=10  # 10 second timeout
            )
            
            if process.returncode != 0:
                print(f"ffmpeg error: {process.stderr}")
                return None
            
            # Check if thumbnail was created
            if not os.path.exists(temp_jpg.name) or os.path.getsize(temp_jpg.name) == 0:
                print("ffmpeg didn't create a valid thumbnail")
                return None
                
            # Read the thumbnail into a buffer
            with open(temp_jpg.name, 'rb') as f:
                jpeg_data = f.read()
                buffer = io.BytesIO(jpeg_data)
                buffer.seek(0)
                return buffer
                
    except subprocess.TimeoutExpired:
        print(f"Timeout while creating video thumbnail - skipping")
        return None
    except subprocess.CalledProcessError as e:
        print(f"Error extracting video thumbnail: {e}")
        return None
    except Exception as e:
        print(f"Error in video thumbnail creation: {e}")
        return None


def get_content_type(file_path):
    """Get the MIME type for a file"""
    # Add additional mime types not correctly identified by mimetypes
    if file_path.lower().endswith(".heic"):
        return "image/heic"
    
    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type:
        return mime_type
    
    # Fallback based on extension
    ext = os.path.splitext(file_path)[1].lower()
    if ext in IMAGE_EXTENSIONS:
        return f"image/{ext[1:]}"
    elif ext in VIDEO_EXTENSIONS:
        return f"video/{ext[1:]}"
    
    return "application/octet-stream"


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
        objects = minio_client.list_objects(BUCKET_NAME, prefix="media/", recursive=True)
        
        # Process each object
        for obj in objects:
            # Parse path components
            path_parts = obj.object_name.split('/')
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
                        "last_modified": obj.last_modified.isoformat() if hasattr(obj, 'last_modified') else None
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
        
        timeline = [{"year": year, "count": count} for year, count in year_counts.items()]
        timeline.sort(key=lambda x: x["year"])
        
        # Create the manifest
        manifest = {
            "photos": photos,
            "timeline": timeline,
            "generated_at": datetime.now().isoformat(),
            "total_photos": len(photos)
        }
        
        # Save manifest to a temporary file
        with tempfile.NamedTemporaryFile(mode='w', suffix='.json', delete=False) as temp_file:
            json.dump(manifest, temp_file, indent=2)
            temp_file_path = temp_file.name
        
        # Upload manifest to Minio
        print(f"Uploading manifest with metadata for {len(photos)} photos...")
        minio_client.fput_object(
            BUCKET_NAME,
            "manifest.json",
            temp_file_path,
            content_type="application/json"
        )
        
        # Clean up temporary file
        os.unlink(temp_file_path)
        
        print(f"✓ Manifest uploaded successfully")
        return True
    
    except Exception as e:
        print(f"Error generating manifest: {e}")
        return False


def upload_photos(photos_dir: str):
    """Upload photos and videos to MinIO with year/month structure"""
    print(f"Uploading media from {photos_dir} to MinIO")
    minio_client = setup_minio_client()
    ensure_bucket_exists(minio_client)

    # Initialize mimetypes
    mimetypes.init()

    # First, collect all eligible files
    eligible_files = []
    for root, _, files in os.walk(photos_dir):
        for file in files:
            file_lower = file.lower()
            if ((any(file_lower.endswith(ext) for ext in IMAGE_EXTENSIONS) or 
                any(file_lower.endswith(ext) for ext in VIDEO_EXTENSIONS)) and 
                not any(file_lower.endswith(skip) for skip in SKIP_FILES)):
                eligible_files.append(os.path.join(root, file))
    
    total_files = len(eligible_files)
    if total_files == 0:
        print("No media files found to upload")
        return

    # Calculate total size for better progress tracking
    total_size = sum(os.path.getsize(f) for f in eligible_files)
    
    # Process files with progress bar
    print(f"Found {total_files} media files to process (Total: {total_size / (1024*1024):.2f} MB)")
    processed_count = 0
    processed_size = 0
    
    # Create progress bar for overall progress
    main_progress = tqdm(total=total_size, desc="Overall progress", unit="B", unit_scale=True)
    
    for file_path in eligible_files:
        file_name = os.path.basename(file_path)
        file_lower = file_name.lower()
        file_size = os.path.getsize(file_path)
        
        # Update progress description with current file
        main_progress.set_description(f"Uploading {file_name} ({file_size / (1024*1024):.2f} MB)")
        
        try:
            start_time = datetime.now()
            
            # Get date from file
            year, month = get_exif_date(file_path)

            # Generate a unique filename based on content hash
            file_hash = hashlib.md5(open(file_path, "rb").read()).hexdigest()[:10]
            
            # Process based on file type
            is_heic = any(file_lower.endswith(ext) for ext in (".heic", ".heif"))
            is_video = any(file_lower.endswith(ext) for ext in VIDEO_EXTENSIONS)
            
            # MAIN MEDIA UPLOAD - Use a single "media" directory
            if is_heic and CONVERT_HEIC:
                # For HEIC, convert to JPEG for web viewing
                jpeg_buffer = convert_heic_to_jpeg(file_path)
                if jpeg_buffer:
                    media_key = f"media/{year}/{month:02d}/{file_hash}.jpg"
                    media_size = jpeg_buffer.getbuffer().nbytes
                    minio_client.put_object(
                        BUCKET_NAME,
                        media_key,
                        jpeg_buffer,
                        media_size,
                        content_type="image/jpeg"
                    )
                    
                    # Calculate and show upload statistics
                    elapsed = (datetime.now() - start_time).total_seconds()
                    speed = media_size / (1024 * 1024 * elapsed) if elapsed > 0 else 0
            else:
                # For other files, upload directly
                ext = os.path.splitext(file_name)[1].lower()
                if is_video:
                    media_key = f"media/{year}/{month:02d}/{file_hash}{ext}"
                else:
                    # For regular images, keep extension but ensure lowercase
                    media_key = f"media/{year}/{month:02d}/{file_hash}{ext}"
                
                # Get content type
                content_type = get_content_type(file_path)
                
                # Upload with progress tracking
                minio_client.fput_object(
                    BUCKET_NAME, 
                    media_key, 
                    file_path,
                    content_type=content_type
                )
                
                # Calculate and show upload statistics
                elapsed = (datetime.now() - start_time).total_seconds()
                speed = file_size / (1024 * 1024 * elapsed) if elapsed > 0 else 0

            # Create and upload thumbnail (regardless of type)
            try:
                thumb_buffer = create_thumbnail(file_path)
                if thumb_buffer:
                    thumbnail_key = f"thumbnails/{year}/{month:02d}/{file_hash}.jpg"
                    thumb_size = thumb_buffer.getbuffer().nbytes
                    minio_client.put_object(
                        BUCKET_NAME,
                        thumbnail_key,
                        thumb_buffer,
                        thumb_size,
                        content_type="image/jpeg"
                    )
                else:
                    print("Thumbnail creation failed - skipping")
            except Exception as e:
                print(f"Error processing thumbnail: {e} - skipping")

            processed_count += 1
            processed_size += file_size
            main_progress.update(file_size)
            
        except Exception as e:
            print(f"\nError processing {file_name}: {e}")
    
    main_progress.close()
    print(f"Uploaded {processed_count} of {total_files} media files to MinIO")
    print(f"Total data transferred: {processed_size / (1024*1024):.2f} MB")
    
    # Generate and upload the manifest file
    generate_manifest(minio_client)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Upload photos to MinIO with organization')
    parser.add_argument('--dir', type=str, default=PHOTOS_DIR, help='Directory containing photos')
    parser.add_argument('--skip-video-thumbnails', action='store_true', help='Skip video thumbnail creation')
    parser.add_argument('--manifest-only', action='store_true', help='Only generate manifest without uploading photos')
    args = parser.parse_args()
    
    # Set global options from command line
    SKIP_VIDEO_THUMBNAILS = args.skip_video_thumbnails
    
    # Run the upload or just generate manifest
    if args.manifest_only:
        minio_client = setup_minio_client()
        ensure_bucket_exists(minio_client)
        generate_manifest(minio_client)
    else:
        upload_photos(args.dir)
