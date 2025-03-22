/**
 * Media utility functions used across components
 */

/**
 * Determines if a given URL points to an image or video file
 */
export const detectMediaType = (url: string): "image" | "video" => {
  const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"];
  const urlLower = url.toLowerCase();
  
  if (videoExtensions.some(ext => urlLower.endsWith(ext))) {
    return "video";
  }
  
  return "image";
};

/**
 * Extracts year and month from a date-based path
 * E.g., "media/2021/05/image.jpg" -> { year: 2021, month: 5 }
 */
export const extractDateFromPath = (path: string): { year: number, month: number } | null => {
  const parts = path.split("/");
  
  // Path format should be media/YYYY/MM/filename
  if (parts.length >= 4) {
    const year = parseInt(parts[1], 10);
    const month = parseInt(parts[2], 10);
    
    if (!isNaN(year) && !isNaN(month)) {
      return { year, month };
    }
  }
  
  return null;
};

/**
 * Checks if an image is fully loaded and cached in the browser
 */
export const isImageLoaded = (src: string): boolean => {
  // Check if there's an image in the cache
  const img = new Image();
  img.src = src;
  return img.complete;
}; 