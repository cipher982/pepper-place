import { useEffect, useRef, useCallback } from "react";
import { Photo } from "../types";
import { detectMediaType } from "../utils/media";

// Number of images to preload before and after current index
const DEFAULT_BUFFER_SIZE = 3;
// Number of thumbnails to preload before and after current index
// Reduced from 100 to 10 to prevent request saturation (200→20 concurrent requests)
const THUMBNAIL_BUFFER_SIZE = 10;

// Helper function to detect media type
// const detectMediaType = (url: string): "image" | "video" => {
//   const videoExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"];
//   const urlLower = url.toLowerCase();
//   
//   if (videoExtensions.some(ext => urlLower.endsWith(ext))) {
//     return "video";
//   }
//   
//   return "image";
// };

interface UseImagePreloaderProps {
  photos: Photo[];
  currentIndex: number;
  bufferSize?: number;
  navigationDirection?: "forward" | "backward" | null;
}

export default function useImagePreloader({
  photos,
  currentIndex,
  bufferSize = DEFAULT_BUFFER_SIZE,
  navigationDirection = null
}: UseImagePreloaderProps) {
  // Cache of loaded images by URL
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
  // Track loading status for each URL
  const loadingStatus = useRef<Map<string, boolean>>(new Map());
  // Track AbortControllers for cancellable requests
  const abortControllers = useRef<Map<string, () => void>>(new Map());

  // Preload a single image and store it in cache
  const preloadImage = useCallback((url: string, isThumbnail = false) => {
    // Skip if already loaded or currently loading
    if (imageCache.current.has(url) || loadingStatus.current.get(url)) {
      return;
    }

    // Skip if this is a video file
    if (detectMediaType(url) === "video") {
      return;
    }

    // Cancel any existing request for this URL
    const existingCancel = abortControllers.current.get(url);
    if (existingCancel) {
      existingCancel();
    }

    // Mark as loading
    loadingStatus.current.set(url, true);

    const img = new Image();
    let cancelled = false;

    // Store cancel function
    const cancelFn = () => {
      cancelled = true;
      img.src = ''; // Stop loading
      loadingStatus.current.set(url, false);
      abortControllers.current.delete(url);
    };
    abortControllers.current.set(url, cancelFn);

    img.onload = () => {
      if (!cancelled) {
        imageCache.current.set(url, img);
        loadingStatus.current.set(url, false);
        abortControllers.current.delete(url);
      }
    };
    img.onerror = () => {
      if (!cancelled) {
        loadingStatus.current.set(url, false);
        abortControllers.current.delete(url);
        console.error(`Failed to preload image: ${url}`);
      }
    };

    img.src = url;
  }, []);

  // Check if an image is cached
  const isImageCached = useCallback((url: string): boolean => {
    return imageCache.current.has(url);
  }, []);

  // Get indexes to preload based on navigation direction and buffer size
  const getPreloadIndexes = useCallback((direction: "forward" | "backward" | null, bufferSize: number) => {
    const indexes: number[] = [];
    
    // Always include the current index
    indexes.push(currentIndex);
    
    // If we have a direction, prioritize loading in that direction
    if (direction === "forward") {
      // Load more ahead when moving forward
      for (let i = 1; i <= bufferSize; i++) {
        const nextIndex = (currentIndex + i) % photos.length;
        indexes.push(nextIndex);
      }
      // And fewer behind
      for (let i = 1; i <= Math.floor(bufferSize / 2); i++) {
        const prevIndex = (currentIndex - i + photos.length) % photos.length;
        indexes.push(prevIndex);
      }
    } else if (direction === "backward") {
      // Load more behind when moving backward
      for (let i = 1; i <= bufferSize; i++) {
        const prevIndex = (currentIndex - i + photos.length) % photos.length;
        indexes.push(prevIndex);
      }
      // And fewer ahead
      for (let i = 1; i <= Math.floor(bufferSize / 2); i++) {
        const nextIndex = (currentIndex + i) % photos.length;
        indexes.push(nextIndex);
      }
    } else {
      // No direction, load evenly in both directions
      for (let i = 1; i <= bufferSize; i++) {
        const nextIndex = (currentIndex + i) % photos.length;
        const prevIndex = (currentIndex - i + photos.length) % photos.length;
        indexes.push(nextIndex, prevIndex);
      }
    }
    
    return indexes;
  }, [currentIndex, photos.length]);

  // Trigger preloading when current index or direction changes
  useEffect(() => {
    if (photos.length === 0) return;

    // Get indexes for full images (smaller buffer)
    const imageIndexes = getPreloadIndexes(navigationDirection, bufferSize);

    // Get indexes for thumbnails (larger buffer)
    const thumbnailIndexes = getPreloadIndexes(navigationDirection, THUMBNAIL_BUFFER_SIZE);

    // Build set of URLs we want to load
    const urlsToLoad = new Set<string>();
    imageIndexes.forEach(index => {
      const photo = photos[index];
      if (photo) urlsToLoad.add(photo.url);
    });
    thumbnailIndexes.forEach(index => {
      const photo = photos[index];
      if (photo) urlsToLoad.add(photo.thumbnailUrl);
    });

    // Cancel any requests that are no longer needed
    abortControllers.current.forEach((cancelFn, url) => {
      if (!urlsToLoad.has(url)) {
        cancelFn();
      }
    });

    // Preload main images
    imageIndexes.forEach(index => {
      const photo = photos[index];
      if (photo) {
        preloadImage(photo.url);
      }
    });

    // Preload thumbnail images (only those that will be visible in the ThumbnailBar)
    thumbnailIndexes.forEach(index => {
      const photo = photos[index];
      if (photo) {
        preloadImage(photo.thumbnailUrl, true);
      }
    });
  }, [photos, currentIndex, navigationDirection, bufferSize, getPreloadIndexes, preloadImage]);

  // Cleanup all pending requests on unmount
  useEffect(() => {
    // Capture ref value for cleanup
    const controllers = abortControllers.current;
    return () => {
      controllers.forEach(cancelFn => cancelFn());
      controllers.clear();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    isImageCached,
    getCachedImage: (url: string) => imageCache.current.get(url),
    getCacheSize: () => imageCache.current.size
  };
} 