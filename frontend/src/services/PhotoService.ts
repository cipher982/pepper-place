import { Photo, MinioConfig, TimelinePeriod, Manifest } from "../types";

// Single object for cache constants
const CACHE = {
  KEY_PREFIX: {
    MANIFEST: "photos_manifest_",
    TIMESTAMP: "photos_manifest_timestamp_"
  },
  // Cache duration in milliseconds (24 hours)
  DURATION: 24 * 60 * 60 * 1000,
  // Disable cache during local development
  DISABLED: process.env.NODE_ENV === "development"
};

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
  private manifestCacheKey: string;
  private timestampCacheKey: string;

  constructor(config: MinioConfig) {
    this.bucket = config.bucket;
    
    // Create bucket-specific cache keys
    this.manifestCacheKey = `${CACHE.KEY_PREFIX.MANIFEST}${this.bucket}`;
    this.timestampCacheKey = `${CACHE.KEY_PREFIX.TIMESTAMP}${this.bucket}`;
    
    // In development mode, clear any existing cache
    if (CACHE.DISABLED) {
      localStorage.removeItem(this.manifestCacheKey);
      localStorage.removeItem(this.timestampCacheKey);
      console.log("Development mode: cleared existing cache");
    }
    
    // Process endpoint and ensure it has a protocol
    let endpoint = config.endpoint;
    
    // If endpoint doesn't have a protocol, add the appropriate one
    if (!endpoint.startsWith("http://") && !endpoint.startsWith("https://")) {
      // Match the current page protocol (or default to http for development)
      const protocol = (typeof window !== "undefined" && window.location.protocol === "https:") 
        ? "https" 
        : "http";
      endpoint = `${protocol}://${endpoint}`;
    }
    
    // Build base URL for direct access (without authentication)
    this.baseUrl = endpoint.endsWith("/") 
      ? `${endpoint}${this.bucket}` 
      : `${endpoint}/${this.bucket}`;
  }

  // Try to load manifest from local storage - simplified
  private loadManifestFromCache(): Manifest | null {
    // Skip cache in development mode
    if (CACHE.DISABLED) {
      console.log("Cache disabled in development mode");
      return null;
    }
    
    try {
      const cachedTimestamp = localStorage.getItem(this.timestampCacheKey);
      const cachedManifest = localStorage.getItem(this.manifestCacheKey);
      
      if (!cachedTimestamp || !cachedManifest) {
        return null;
      }

      // Check if cache is still valid
      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();
      
      if (now - timestamp > CACHE.DURATION) {
        // Cache expired, clear it
        localStorage.removeItem(this.manifestCacheKey);
        localStorage.removeItem(this.timestampCacheKey);
        return null;
      }
      
      // Parse and validate the manifest structure
      const manifest = JSON.parse(cachedManifest) as Manifest;
      
      if (!manifest || !Array.isArray(manifest.photos) || !Array.isArray(manifest.timeline)) {
        return null;
      }
      
      return manifest;
    } catch (error) {
      console.error("Error loading manifest from cache:", error);
      return null;
    }
  }

  // Save manifest to local storage - simplified
  private saveManifestToCache(manifest: Manifest): void {
    // Skip saving to cache in development mode
    if (CACHE.DISABLED) {
      return;
    }
    
    try {
      localStorage.setItem(this.manifestCacheKey, JSON.stringify(manifest));
      localStorage.setItem(this.timestampCacheKey, Date.now().toString());
    } catch (error) {
      console.error("Error saving manifest to cache:", error);
      // If we can't save to localStorage (e.g., it's full), just proceed without caching
    }
  }

  // Fetch the complete manifest and cache it - simplified
  private async fetchManifest(): Promise<Manifest> {
    try {
      const manifestUrl = `${this.baseUrl}/${PATHS.MANIFEST_PATH}`;
      
      // Set no-cache headers to avoid browser caching issues
      const options = {
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          "Pragma": "no-cache",
          "Expires": "0"
        }
      };
      
      // Fetch the manifest
      const response = await fetch(manifestUrl, options);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
      }
      
      // Try to parse as JSON
      let manifest: Manifest;
      try {
        manifest = await response.json() as Manifest;
      } catch (parseError) {
        const text = await response.clone().text();
        const preview = text.substring(0, 100);
        throw new Error(`Expected JSON but received: ${preview}...`);
      }
      
      // Validate the manifest structure
      if (!manifest || !Array.isArray(manifest.photos) || !Array.isArray(manifest.timeline)) {
        throw new Error("Invalid manifest format: missing photos or timeline arrays");
      }
      
      // Cache in memory and local storage
      this.manifestCache = manifest;
      this.saveManifestToCache(manifest);
      
      return manifest;
    } catch (error) {
      console.error("Error fetching manifest:", error);
      throw new Error(`Failed to fetch manifest: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  // Get the manifest file - simplified
  async getManifest(): Promise<Manifest> {
    // Return cached manifest in memory if available
    if (this.manifestCache) {
      return this.manifestCache;
    }

    // Try to load from local storage first
    const cachedManifest = this.loadManifestFromCache();
    if (cachedManifest) {
      this.manifestCache = cachedManifest;
      return cachedManifest;
    }

    // Fetch fresh manifest if not in cache
    return this.fetchManifest();
  }

  // Clear all manifest cache for this bucket
  clearCache(): void {
    localStorage.removeItem(this.manifestCacheKey);
    localStorage.removeItem(this.timestampCacheKey);
    this.manifestCache = null;
    console.log(`Cache cleared for bucket: ${this.bucket}`);
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
        timestamp: photo.timestamp,
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
        
        // Reconstruct as thumbnails/YYYY/MM/filename.webp (thumbnails are now WebP format)
        const thumbnailPath = `${PATHS.THUMBNAIL_PREFIX}${pathParts[1]}/${pathParts[2]}/${filenameWithoutExt}.webp`;
        return `${this.baseUrl}/${thumbnailPath}`;
      }
    }
    
    // Fallback to a placeholder
    return "/placeholder-thumbnail.jpg";
  }
}

export default PhotoService; 