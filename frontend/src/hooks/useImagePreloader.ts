import { useEffect, useRef, useCallback } from "react";
import { Photo } from "../types";

// Number of images to preload before and after current index
const DEFAULT_BUFFER_SIZE = 3;

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

  // Preload a single image and store it in cache
  const preloadImage = useCallback((url: string) => {
    // Skip if already loaded or currently loading
    if (imageCache.current.has(url) || loadingStatus.current.get(url)) {
      return;
    }

    // Mark as loading
    loadingStatus.current.set(url, true);

    const img = new Image();
    img.onload = () => {
      imageCache.current.set(url, img);
      loadingStatus.current.set(url, false);
    };
    img.onerror = () => {
      loadingStatus.current.set(url, false);
      console.error(`Failed to preload image: ${url}`);
    };
    img.src = url;
  }, []);

  // Check if an image is cached
  const isImageCached = useCallback((url: string): boolean => {
    return imageCache.current.has(url);
  }, []);

  // Get indexes to preload based on navigation direction and buffer size
  const getPreloadIndexes = useCallback((direction: "forward" | "backward" | null) => {
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
  }, [currentIndex, bufferSize, photos.length]);

  // Trigger preloading when current index or direction changes
  useEffect(() => {
    if (photos.length === 0) return;

    const preloadIndexes = getPreloadIndexes(navigationDirection);
    
    // Preload both full images and thumbnails
    preloadIndexes.forEach(index => {
      const photo = photos[index];
      if (photo) {
        preloadImage(photo.url);
        preloadImage(photo.thumbnailUrl);
      }
    });
  }, [photos, currentIndex, navigationDirection, getPreloadIndexes, preloadImage]);

  return {
    isImageCached,
    getCachedImage: (url: string) => imageCache.current.get(url),
    getCacheSize: () => imageCache.current.size
  };
} 