import { useEffect, useState, useCallback, useRef } from "react";
import { Photo } from "../types";

interface UsePhotoNavigationProps {
  photos: Photo[];
  initialIndex?: number;
}

export default function usePhotoNavigation({ 
  photos, 
  initialIndex = 0 
}: UsePhotoNavigationProps) {
  // Store all photos in chronological order
  const sortedPhotos = useRef<Photo[]>([]);
  // Current index in the global photos array
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Reference to track navigation direction
  const lastDirection = useRef<"forward" | "backward" | null>(null);
  // Timestamp of last arrow key navigation
  const lastArrowTime = useRef<number>(0);
  // Navigation lock to prevent rapid changes
  const isNavigationLocked = useRef<boolean>(false);
  // Lock timeout reference
  const navigationLockTimer = useRef<any>(null);

  // Sort photos by year and month when the photos array changes
  useEffect(() => {
    if (photos.length === 0) return;
    
    // Sort by year (ascending) and then by month (ascending)
    const chronologicalPhotos = [...photos].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
    
    sortedPhotos.current = chronologicalPhotos;
    
    // Ensure current index is valid
    if (currentIndex >= chronologicalPhotos.length) {
      setCurrentIndex(0);
    }
  }, [photos, currentIndex]);

  // Get current photo
  const currentPhoto = sortedPhotos.current[currentIndex];

  // Function to lock navigation for a period of time
  const lockNavigation = useCallback((durationMs: number = 250) => {
    // Clear any existing lock
    if (navigationLockTimer.current) {
      clearTimeout(navigationLockTimer.current);
    }
    
    // Set the lock
    isNavigationLocked.current = true;
    
    // Schedule unlock
    navigationLockTimer.current = setTimeout(() => {
      isNavigationLocked.current = false;
      navigationLockTimer.current = null;
    }, durationMs);
  }, []);

  // Navigate to next photo with strong debouncing
  const nextPhoto = useCallback(() => {
    if (sortedPhotos.current.length === 0) return;
    
    // Skip if navigation is locked
    if (isNavigationLocked.current) return;
    
    // Record time for debugging/coordination
    lastArrowTime.current = Date.now();
    
    // Set direction and update index
    lastDirection.current = "forward";
    
    // Lock navigation to prevent rapid changes
    lockNavigation(250);
    
    // Update the index
    setCurrentIndex(prevIndex => {
      return prevIndex + 1 >= sortedPhotos.current.length ? 0 : prevIndex + 1;
    });
  }, [lockNavigation]);

  // Navigate to previous photo with strong debouncing
  const prevPhoto = useCallback(() => {
    if (sortedPhotos.current.length === 0) return;
    
    // Skip if navigation is locked
    if (isNavigationLocked.current) return;
    
    // Record time for debugging/coordination
    lastArrowTime.current = Date.now();
    
    // Set direction
    lastDirection.current = "backward";
    
    // Lock navigation to prevent rapid changes
    lockNavigation(250);
    
    // Update the index
    setCurrentIndex(prevIndex => {
      return prevIndex - 1 < 0 ? sortedPhotos.current.length - 1 : prevIndex - 1;
    });
  }, [lockNavigation]);

  // Jump to specific year with protection against rapid changes
  const jumpToYear = useCallback((yearValue: number) => {
    if (sortedPhotos.current.length === 0) return;
    
    // Skip if navigation is locked from arrow keys
    if (isNavigationLocked.current) return;
    
    // For integer year values, find the first photo of that year
    if (Number.isInteger(yearValue)) {
      const yearIndex = sortedPhotos.current.findIndex(photo => photo.year === yearValue);
      if (yearIndex >= 0 && yearIndex !== currentIndex) {
        // Lock navigation to prevent conflicts
        lockNavigation(250);
        setCurrentIndex(yearIndex);
        return;
      }
    }
    
    // For floating-point year values, extract year and month components
    const year = Math.floor(yearValue);
    const monthFraction = yearValue - year;
    const targetMonth = Math.round(monthFraction * 12) || 1; // If 0, use January (1)
    
    // Find the photo closest to the specified year and month
    let bestMatchIndex = -1;
    let bestMatchDiff = Infinity;
    
    sortedPhotos.current.forEach((photo, index) => {
      // Calculate how close this photo is to the target date
      // Weight year difference more heavily than month difference
      const yearDiff = Math.abs(photo.year - year) * 12;
      const monthDiff = Math.abs(photo.month - targetMonth);
      const totalDiff = yearDiff + monthDiff;
      
      if (totalDiff < bestMatchDiff) {
        bestMatchDiff = totalDiff;
        bestMatchIndex = index;
      }
    });
    
    if (bestMatchIndex >= 0 && bestMatchIndex !== currentIndex) {
      // Lock navigation to prevent conflicts
      lockNavigation(250);
      setCurrentIndex(bestMatchIndex);
    }
  }, [currentIndex, lockNavigation]);

  // Clean up lock timer on unmount
  useEffect(() => {
    return () => {
      if (navigationLockTimer.current) {
        clearTimeout(navigationLockTimer.current);
      }
    };
  }, []);

  // Get information about current position
  const getPosition = useCallback(() => {
    if (sortedPhotos.current.length === 0) return { index: 0, total: 0, year: 0, month: 0 };
    
    const photo = sortedPhotos.current[currentIndex];
    return {
      index: currentIndex,
      total: sortedPhotos.current.length,
      year: photo.year,
      month: photo.month
    };
  }, [currentIndex]);

  // Set up keyboard event listeners for arrow keys with debouncing
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") {
        nextPhoto();
      } else if (e.key === "ArrowLeft") {
        prevPhoto();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPhoto, prevPhoto]);

  // Get navigation direction
  const getNavigationDirection = useCallback(() => {
    return lastDirection.current;
  }, []);

  return {
    currentPhoto,
    currentIndex,
    setCurrentIndex,
    nextPhoto,
    prevPhoto,
    jumpToYear,
    getPosition,
    getNavigationDirection,
    totalPhotos: sortedPhotos.current.length
  };
} 