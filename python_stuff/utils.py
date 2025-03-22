import os
from datetime import datetime

from PIL import Image
from PIL.ExifTags import TAGS
import io
import subprocess
import tempfile
import mimetypes
import json
import re
from typing import Tuple, Optional, List


def get_exif_date(
    file_path: str, video_extensions: List[str], image_extensions: List[str]
) -> Tuple[int, int]:
    """Extract date from media metadata or use file modification date as fallback"""
    file_lower = file_path.lower()

    # For videos, use ffprobe to extract creation date
    if any(file_lower.endswith(ext) for ext in video_extensions):
        try:
            # Try using ffprobe to get creation date
            cmd = [
                "ffprobe",
                "-v",
                "quiet",
                "-print_format",
                "json",
                "-show_entries",
                "format_tags=creation_time:format=filename,duration",
                file_path,
            ]
            result = subprocess.run(cmd, capture_output=True, text=True, check=False)

            if result.returncode == 0:
                metadata = json.loads(result.stdout)
                # Try to find creation_time in tags
                if (
                    "format" in metadata
                    and "tags" in metadata["format"]
                    and "creation_time" in metadata["format"]["tags"]
                ):
                    creation_time = metadata["format"]["tags"]["creation_time"]
                    # Parse ISO format date like "2023-04-15T12:30:45.000000Z"
                    date_obj = datetime.fromisoformat(
                        creation_time.replace("Z", "+00:00")
                    )
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


def extract_date_with_exiftool(file_path: str) -> Tuple[int, int]:
    """Extract creation date using exiftool as a fallback method"""
    try:
        # Common date tags to try in order of preference
        date_tags = [
            "DateTimeOriginal",
            "CreateDate",
            "MediaCreateDate",
            "TrackCreateDate",
            "CreationDate",
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


def convert_heic_to_jpeg(
    heic_path: str, web_image_quality: int
) -> Optional[io.BytesIO]:
    """Convert HEIC to JPEG format using sips (macOS) or PIL with pillow-heif"""
    try:
        # Using macOS sips command (more reliable than Python libraries)
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=True) as temp_jpg:
            subprocess.run(
                [
                    "sips",
                    "-s",
                    "format",
                    "jpeg",
                    "-s",
                    "formatOptions",
                    str(web_image_quality),
                    heic_path,
                    "--out",
                    temp_jpg.name,
                ],
                check=True,
                capture_output=True,
            )

            # Read the converted file into a buffer
            with open(temp_jpg.name, "rb") as f:
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


def create_video_thumbnail(video_path: str) -> Optional[io.BytesIO]:
    """Extract a thumbnail from a video file using ffmpeg"""
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=True) as temp_jpg:
            # Set a timeout for ffmpeg process
            cmd = [
                "ffmpeg",
                "-y",
                "-i",
                video_path,
                "-ss",
                "00:00:00.000",  # Extract from the start of the video instead of 1 second in
                "-vframes",
                "1",
                "-vf",
                "scale=300:-1",
                temp_jpg.name,
            ]
            
            process = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                check=False,
                timeout=15,  # Increased timeout to 15 seconds
            )

            if process.returncode != 0:
                print(f"FFmpeg error for {os.path.basename(video_path)}: {process.stderr[:200]}...")
                return None

            # Check if thumbnail was created
            if not os.path.exists(temp_jpg.name) or os.path.getsize(temp_jpg.name) == 0:
                print(f"FFmpeg didn't create a valid thumbnail for {os.path.basename(video_path)}")
                return None

            # Read the thumbnail into a buffer
            with open(temp_jpg.name, "rb") as f:
                jpeg_data = f.read()
                buffer = io.BytesIO(jpeg_data)
                buffer.seek(0)
                return buffer

    except subprocess.TimeoutExpired:
        print(f"Timeout while creating thumbnail for {os.path.basename(video_path)} - ffmpeg process took too long")
        return None
    except subprocess.CalledProcessError as e:
        print(f"Error extracting thumbnail for {os.path.basename(video_path)}: {e}")
        return None
    except Exception as e:
        print(f"Unexpected error creating thumbnail for {os.path.basename(video_path)}: {e.__class__.__name__}: {e}")
        return None


def get_content_type(
    file_path: str, video_extensions: List[str], image_extensions: List[str]
) -> str:
    """Get the MIME type for a file"""
    # Add additional mime types not correctly identified by mimetypes
    if file_path.lower().endswith(".heic"):
        return "image/heic"

    mime_type, _ = mimetypes.guess_type(file_path)
    if mime_type:
        return mime_type

    # Fallback based on extension
    ext = os.path.splitext(file_path)[1].lower()
    if ext in image_extensions:
        return f"image/{ext[1:]}"
    elif ext in video_extensions:
        return f"video/{ext[1:]}"

    return "application/octet-stream"


def validate_video_file(video_path: str) -> Tuple[bool, str]:
    """
    Validate a video file to check if it's playable and not corrupted.
    
    Args:
        video_path: Path to the video file
        
    Returns:
        Tuple of (is_valid, error_message)
    """
    try:
        # Use ffprobe to check if the file is valid
        cmd = [
            "ffprobe", 
            "-v", "error",
            "-select_streams", "v:0", 
            "-show_entries", "stream=codec_name,width,height,duration:format=duration,size", 
            "-of", "json",
            video_path
        ]
        
        process = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
            timeout=10
        )
        
        if process.returncode != 0:
            return False, f"FFprobe validation failed: {process.stderr.strip()}"
        
        # Parse the output
        try:
            data = json.loads(process.stdout)
            if not data.get("streams"):
                return False, "No video streams found in file"
                
            # Get video information
            stream = data["streams"][0]
            width = stream.get("width", "unknown")
            height = stream.get("height", "unknown")
            codec = stream.get("codec_name", "unknown")
            
            # Get duration from format section (more reliable)
            duration = None
            file_size_bytes = None
            if "format" in data:
                duration_str = data["format"].get("duration")
                if duration_str:
                    duration = float(duration_str)
                
                size_str = data["format"].get("size")
                if size_str:
                    file_size_bytes = int(size_str)
            
            result_msg = f"Valid video: {codec} {width}x{height}"
            if duration is not None:
                result_msg += f", duration: {duration:.2f}s"
            if file_size_bytes is not None:
                size_mb = file_size_bytes / (1024 * 1024)
                result_msg += f", size: {size_mb:.2f}MB"
                
            return True, result_msg
            
        except json.JSONDecodeError:
            return False, "Failed to parse ffprobe output"
            
    except subprocess.TimeoutExpired:
        return False, "Timeout while validating video"
    except Exception as e:
        return False, f"Error validating video: {e.__class__.__name__}: {e}"


def get_video_metadata(video_path: str) -> Tuple[Optional[float], Optional[float]]:
    """
    Get video duration and size in MB.
    
    Args:
        video_path: Path to the video file
        
    Returns:
        Tuple of (duration_seconds, size_mb) or (None, None) if not available
    """
    try:
        # Use ffprobe to get metadata
        cmd = [
            "ffprobe", 
            "-v", "error",
            "-show_entries", "format=duration,size", 
            "-of", "json",
            video_path
        ]
        
        process = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            check=False,
            timeout=10
        )
        
        if process.returncode != 0:
            return None, None
        
        # Parse the output
        data = json.loads(process.stdout)
        
        duration = None
        size_mb = None
        
        if "format" in data:
            # Get duration
            duration_str = data["format"].get("duration")
            if duration_str:
                duration = float(duration_str)
            
            # Get file size
            size_str = data["format"].get("size")
            if size_str:
                size_mb = int(size_str) / (1024 * 1024)
        
        return duration, size_mb
        
    except Exception as e:
        print(f"Error getting video metadata: {e}")
        return None, None


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
