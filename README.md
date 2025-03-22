# Pepper Place: Dog Photo Timeline

This repo contains the code for an interactive timeline of Pepper the dog’s photos. It allows you to view a chronological gallery of images and videos, and includes a Python script to process and upload new media files to MinIO.

## What This Project Does

• Provides a React-based UI that displays Pepper’s photos and videos in a visually appealing timeline.  
• Uses a Python upload script to handle photo/video ingestion, auto-organization, and manifest generation for the frontend.  
• Relies on MinIO (or any S3-compatible storage) to host media files and the generated manifest.json for easy retrieval by the React client.  

## Core Features & Flow

1. Photo Upload & Processing  
   – The Python script (python_stuff/upload_photos.py) reads media from local directories, extracts EXIF metadata to determine date, converts HEIC to JPEG, and generates thumbnails or video frames as needed.  
   – It uploads both the original (or converted) media and the thumbnail to MinIO.  
   – Finally, it generates and uploads a manifest.json file with references to all photos (ID, path, year, etc.).  

2. React Frontend  
   – The frontend (in frontend/src) fetches manifest.json and produces a timeline.  
   – The Timeline component in components/Timeline.tsx manages year-based navigation.  
   – The PhotoGallery component in components/PhotoGallery.tsx displays photos/videos in a carousel with optional fullscreen mode.  
   – The application loads quickly by caching the manifest and performing lazy image loading where possible.

3. Timeline & Photo Navigation  
   – Photos are organized by date. The timeline groups photos by year and displays a slider UI for jumping to different periods.  
   – The user can select a year in the timeline, and the PhotoGallery automatically navigates to the first photo of that year.  

4. Common Places to Fix or Extend  
   – Modifying photo or video rendering (PhotoGallery.tsx)  
   – Adjusting how date metadata is parsed (upload_photos.py)  
   – Adding extra fields/tags in the manifest generation or timeline logic (upload_photos.py + PhotoService.ts)  
   – Tuning performance for large media sets or customizing the sorting logic in the React build.  

## Helpful Notes for Debugging

• The manifest.json is the single source of truth for all photo data. If you see incorrect or missing photos in the UI, check that manifest is generated and uploaded correctly.  
• Video playback issues often relate to the browser’s supported formats. The code attempts to auto-play and loop certain video types (e.g., MP4).  
• If you need to alter the thumbnail creation (e.g., different poster frame for videos), edit the create_video_thumbnail function in upload_photos.py.  

## Next Steps & Ideas

• Tagging and searching photos directly in the UI.  
• Improving the video handling flow (e.g., detecting failure and showing fallback images).  
• Enhancing the timeline with transitions or extended metadata (location, descriptions).  

---

> Use this document as quick project context to identify the key components of Pepper Place and the usual spots where you’ll add or fix features. If something’s unclear, look at the code comments in the relevant Python or TypeScript files—those will often guide you to the right place for deeper changes.