# Pepper Place: Dog Photo Timeline

A beautiful interactive timeline to view photos of Pepper (the dog) throughout the years.

## Features

- Timeline slider to navigate between years
- Photo gallery with slideshow and fullscreen capabilities
- Responsive design that works on all devices
- Connected to MinIO (S3-compatible storage) for photo storage

## Setup Instructions

### Prerequisites

- Node.js and npm
- MinIO server (or any S3-compatible storage)
- A collection of dog photos sorted by year

### Installation

1. Clone this repository
2. Install dependencies:
   ```
   npm install
   ```
3. Configure your MinIO/S3 credentials in the `.env` file:
   ```
   REACT_APP_S3_ENDPOINT=your-minio-endpoint
   REACT_APP_S3_ACCESS_KEY=your-access-key
   REACT_APP_S3_SECRET_KEY=your-secret-key
   REACT_APP_S3_BUCKET=your-bucket-name
   ```

### Photo Organization

For the timeline to work properly, upload your photos to your MinIO bucket with the following structure:
```
photos/YYYY/MM/image.jpg
```

For example:
```
photos/2020/01/pepper_snow.jpg
photos/2021/06/pepper_beach.jpg
```

### Running the App

In development mode:
```
npm start
```

Building for production:
```
npm run build
```

## Deployment

After building the app, you can deploy the contents of the `build` directory to any static hosting service like Netlify, Vercel, GitHub Pages, or a simple S3 bucket.

## Next Steps

- Add tagging and search functionality
- Implement image optimization
- Add animation and transitions between years
- Create an admin interface for uploading and tagging photos
