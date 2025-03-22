import { Photo, MinioConfig, TimelinePeriod, Manifest } from "../types";

// Constants for paths
const PATHS = {
  MEDIA_PREFIX: "media/",
  THUMBNAIL_PREFIX: "thumbnails/",
  MANIFEST_PATH: "manifest.json"
};

// Constants for cache
const CACHE_KEYS = {
  MANIFEST: "pepper_photos_manifest",
  MANIFEST_TIMESTAMP: "pepper_photos_manifest_timestamp",
  MANIFEST_GENERATED_AT: "pepper_photos_manifest_generated_at"
};

// Cache duration in milliseconds (24 hours)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

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

  // Try to load manifest from local storage
  private loadManifestFromCache(): Manifest | null {
    try {
      const cachedTimestamp = localStorage.getItem(CACHE_KEYS.MANIFEST_TIMESTAMP);
      const cachedManifest = localStorage.getItem(CACHE_KEYS.MANIFEST);
      
      if (!cachedTimestamp || !cachedManifest) {
        return null;
      }

      // Check if cache is still valid
      const timestamp = parseInt(cachedTimestamp, 10);
      const now = Date.now();
      
      if (now - timestamp > CACHE_DURATION) {
        // Cache expired, clear it
        localStorage.removeItem(CACHE_KEYS.MANIFEST);
        localStorage.removeItem(CACHE_KEYS.MANIFEST_TIMESTAMP);
        localStorage.removeItem(CACHE_KEYS.MANIFEST_GENERATED_AT);
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

  // Save manifest to local storage
  private saveManifestToCache(manifest: Manifest): void {
    try {
      localStorage.setItem(CACHE_KEYS.MANIFEST, JSON.stringify(manifest));
      localStorage.setItem(CACHE_KEYS.MANIFEST_TIMESTAMP, Date.now().toString());
      // Store the generated_at timestamp separately for quick comparison
      if (manifest.generated_at) {
        localStorage.setItem(CACHE_KEYS.MANIFEST_GENERATED_AT, manifest.generated_at);
      }
    } catch (error) {
      console.error("Error saving manifest to cache:", error);
      // If we can't save to localStorage (e.g., it's full), just proceed without caching
    }
  }

  // Fetch only the generated_at field from the manifest to check for updates
  private async fetchRemoteGeneratedAt(): Promise<string | null> {
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
      
      const response = await fetch(manifestUrl, options);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch manifest: ${response.status} ${response.statusText}`);
      }
      
      // Parse just enough to get the generated_at field
      const data = await response.json();
      return data.generated_at || null;
    } catch (error) {
      console.error("Error fetching remote generated_at:", error);
      return null;
    }
  }

  // Fetch the complete manifest and cache it
  private async fetchAndCacheNewManifest(): Promise<Manifest> {
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
      
      // Cache in memory and local storage
      this.manifestCache = manifest;
      this.saveManifestToCache(manifest);
      
      return manifest;
    } catch (error) {
      console.error("Error fetching manifest:", error);
      throw new Error(`Failed to fetch manifest: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  // Fetch the manifest file
  async getManifest(): Promise<Manifest> {
    // Return cached manifest in memory if available
    if (this.manifestCache) {
      return this.manifestCache;
    }

    // Try to load from local storage first
    const cachedManifest = this.loadManifestFromCache();
    if (cachedManifest) {
      // Check if the remote manifest is newer than our cached one
      const cachedGeneratedAt = localStorage.getItem(CACHE_KEYS.MANIFEST_GENERATED_AT);
      if (cachedGeneratedAt) {
        try {
          // Compare with the remote version
          const remoteGeneratedAt = await this.fetchRemoteGeneratedAt();
          
          // If the cached and remote generated_at values match, use the cached manifest
          if (remoteGeneratedAt && remoteGeneratedAt === cachedGeneratedAt) {
            console.log("Using cached manifest from local storage (same generated_at)");
            this.manifestCache = cachedManifest;
            return cachedManifest;
          } else {
            console.log("Remote manifest is newer. Fetching updated manifest.");
          }
        } catch (error) {
          console.warn("Could not fetch remote generated_at. Falling back to full fetch.");
        }
      }
    }

    // If no valid local cache or the cache is outdated, fetch the full manifest
    return this.fetchAndCacheNewManifest();
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