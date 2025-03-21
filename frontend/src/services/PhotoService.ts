import { Photo, MinioConfig, TimelinePeriod, Manifest } from "../types";

// Constants for paths
const PATHS = {
  MEDIA_PREFIX: "media/",
  THUMBNAIL_PREFIX: "thumbnails/",
  MANIFEST_PATH: "manifest.json"
};

class PhotoService {
  private bucket: string;
  private baseUrl: string;
  private manifestCache: Manifest | null = null;

  constructor(config: MinioConfig) {
    this.bucket = config.bucket;
    
    // Ensure endpoint has protocol
    let endpoint = config.endpoint;
    if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
      endpoint = `http://${endpoint}`;
    }
    
    // Build base URL for direct access (without authentication)
    this.baseUrl = endpoint.endsWith("/") 
      ? `${endpoint}${this.bucket}` 
      : `${endpoint}/${this.bucket}`;
  }

  // Fetch the manifest file
  async getManifest(): Promise<Manifest> {
    // Return cached manifest if available
    if (this.manifestCache) {
      return this.manifestCache;
    }

    try {
      // Try both direct URL formats to handle different server configurations
      // Some servers might respond correctly to the baseUrl/manifest.json format
      // while others might need the baseUrl format with manifest.json as a query parameter
      const manifestUrl = `${this.baseUrl}/${PATHS.MANIFEST_PATH}`;
      
      // Set no-cache headers to avoid browser caching issues
      const options = {
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      };
      
      // Fetch the manifest
      const response = await fetch(manifestUrl, options);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
      }
      
      // Try to parse as JSON first
      let manifest: Manifest;
      try {
        manifest = await response.json() as Manifest;
      } catch (parseError) {
        // If we got an HTML response instead of JSON, it's likely we're hitting a web server
        // that's returning an HTML error page or a redirect page
        const text = await response.clone().text();
        const preview = text.substring(0, 100);
        throw new Error(`Expected JSON but received: ${preview}...`);
      }
      
      // Validate the manifest structure
      if (!manifest || !Array.isArray(manifest.photos) || !Array.isArray(manifest.timeline)) {
        throw new Error("Invalid manifest format: missing photos or timeline arrays");
      }
      
      this.manifestCache = manifest;
      return manifest;
    } catch (error) {
      console.error("Error fetching manifest:", error);
      throw new Error(`Failed to fetch manifest: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  async listPhotos(): Promise<Photo[]> {
    try {
      const manifest = await this.getManifest();
      
      // Transform manifest photos to Photo objects with proper URLs
      return manifest.photos.map(photo => ({
        id: photo.id,
        url: this.getPhotoUrl(photo.path),
        thumbnailUrl: this.getThumbnailUrl(photo.path),
        year: photo.year,
        month: photo.month,
        tags: []
      }));
    } catch (error) {
      console.error("Error fetching photos:", error);
      throw new Error(`Failed to fetch photos: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  // Get time periods (years) for the timeline
  async getTimeline(): Promise<TimelinePeriod[]> {
    try {
      const manifest = await this.getManifest();
      return manifest.timeline;
    } catch (error) {
      console.error("Error fetching timeline:", error);
      throw new Error(`Failed to fetch timeline: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  // Get direct URL for a photo
  getPhotoUrl(key: string): string {
    return `${this.baseUrl}/${key}`;
  }
  
  // Get thumbnail URL from a media path
  getThumbnailUrl(mediaPath: string): string {
    // Convert from media path to thumbnail path
    // Replace media prefix with thumbnail prefix
    if (mediaPath.startsWith(PATHS.MEDIA_PREFIX)) {
      const pathParts = mediaPath.split("/");
      if (pathParts.length >= 4) {
        // Extract filename without extension to handle format conversion
        const filename = pathParts[3];
        const filenameWithoutExt = filename.substring(0, filename.lastIndexOf("."));
        
        // Reconstruct as thumbnails/YYYY/MM/filename.jpg (thumbnails are always jpg)
        const thumbnailPath = `${PATHS.THUMBNAIL_PREFIX}${pathParts[1]}/${pathParts[2]}/${filenameWithoutExt}.jpg`;
        return `${this.baseUrl}/${thumbnailPath}`;
      }
    }
    
    // Fallback to a placeholder
    return "/placeholder-thumbnail.jpg";
  }
}

export default PhotoService; 