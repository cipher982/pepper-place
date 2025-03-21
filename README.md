# Pepper Place: Dog Photo Timeline

A beautiful interactive timeline to view photos of Pepper (the dog) throughout the years.

## Features

- Timeline slider to navigate between years
- Photo gallery with slideshow and fullscreen capabilities
- Responsive design that works on all devices
- Connected to MinIO (S3-compatible storage) for photo storage

### Photo Organization

Photos and videos are stored in MinIO with the following organization:

```
media/YYYY/MM/file_hash.ext
thumbnails/YYYY/MM/file_hash.jpg
```

Each file is processed as follows:
- HEIC/HEIF images are automatically converted to JPEG for web compatibility
- All other image formats (JPG, PNG) are preserved in their original format
- Videos (MP4, MOV) are stored in their original format
- All media types have thumbnails generated and stored as JPGs

For example:
```
media/2020/01/a1b2c3d4e5.jpg       # A regular JPG or converted HEIC image
media/2021/06/f6g7h8i9j0.mp4       # A video file
thumbnails/2020/01/a1b2c3d4e5.jpg   # Thumbnail for the image
thumbnails/2021/06/f6g7h8i9j0.jpg   # Thumbnail for the video (extracted frame)
```

The filenames are based on a hash of the file contents, ensuring uniqueness while removing original filenames that might contain personally identifiable information.

### Running the App

In development mode:
```
npm start
```

Building for production:
```
npm run build
```

## Photo Upload Tool

The repository includes a photo upload script that processes media files and uploads them to MinIO with proper organization.

### Features
- Automatic organization by date (extracted from EXIF metadata)
- HEIC/HEIF conversion to web-friendly JPEG format
- Thumbnail generation for all media types (including video frames)
- Progress tracking with upload speed metrics
- Error handling and retry capabilities

### Usage
```bash
# Basic usage
cd python_stuff
uv run python upload_photos.py

# With custom directory
uv run python upload_photos.py --dir /path/to/photos

# Skip video thumbnail generation (faster)
uv run python upload_photos.py --skip-video-thumbnails
```

### Requirements
- Python 3.8+
- MinIO server
- ffmpeg (for video processing)
- exiftool (for metadata extraction)
- Required Python packages (install with UV):
  ```
  uv pip install minio pillow python-dotenv tqdm
  ```

## Next Steps

- Add tagging and search functionality
- Implement image optimization
- Add animation and transitions between years
- Create an admin interface for uploading and tagging photos
