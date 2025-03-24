import { useEffect, useState, useCallback, useRef } from "react";
import { Photo } from "../types";

interface UsePhotoNavigationProps {
  photos: Photo[];
  initialIndex?: number;
  onNavigationChange?: (isKeyboardActive: boolean) => void;
}

export default function usePhotoNavigation({ 
  photos, 
  initialIndex = 0,
  onNavigationChange
}: UsePhotoNavigationProps) {
  // Store all photos in chronological order
  const sortedPhotos = useRef<Photo[]>([]);
  // Current index in the global photos array
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  // Reference to track navigation direction
  const lastDirection = useRef<"forward" | "backward" | null>(null);
  // Flag to track if keyboard navigation is active
  const isKeyboardNavActive = useRef(false);

  // Sort photos by year and month when the photos array changes
  useEffect(() => {
    if (photos.length === 0) return;
    
    // No need to sort photos since they come pre-sorted from the backend
    sortedPhotos.current = [...photos];
    
    // Ensure current index is valid
    if (currentIndex >= photos.length) {
      setCurrentIndex(0);
    }
  }, [photos, currentIndex]);

  // Get current photo
  const currentPhoto = sortedPhotos.current[currentIndex];

  // Set keyboard navigation state and notify
  const setKeyboardNavigationActive = useCallback((active: boolean) => {
    isKeyboardNavActive.current = active;
    if (onNavigationChange) {
      onNavigationChange(active);
    }
  }, [onNavigationChange]);

  // Navigate to next photo
  const nextPhoto = useCallback(() => {
    if (sortedPhotos.current.length === 0) return;
    
    // Set keyboard navigation active
    setKeyboardNavigationActive(true);
    
    lastDirection.current = "forward";
    setCurrentIndex(prevIndex => 
      prevIndex + 1 >= sortedPhotos.current.length ? 0 : prevIndex + 1);
    
    // Reset keyboard navigation flag after a short delay
    setTimeout(() => setKeyboardNavigationActive(false), 200);
  }, [setKeyboardNavigationActive]);

  // Navigate to previous photo
  const prevPhoto = useCallback(() => {
    if (sortedPhotos.current.length === 0) return;
    
    // Set keyboard navigation active
    setKeyboardNavigationActive(true);
    
    lastDirection.current = "backward";
    setCurrentIndex(prevIndex => 
      prevIndex - 1 < 0 ? sortedPhotos.current.length - 1 : prevIndex - 1);
    
    // Reset keyboard navigation flag after a short delay
    setTimeout(() => setKeyboardNavigationActive(false), 200);
  }, [setKeyboardNavigationActive]);

  // Jump to specific year - simplified approach
  const jumpToYear = useCallback((yearValue: number) => {
    if (sortedPhotos.current.length === 0) return;
    
    // Handle fractional year values by extracting year and month
    const targetYear = Math.floor(yearValue);
    const targetMonth = Math.round((yearValue - targetYear) * 12) || 1; // Convert decimal to month (1-12)
    
    // First try to find a photo matching both year and month
    let foundIndex = sortedPhotos.current.findIndex(
      photo => photo.year === targetYear && photo.month === targetMonth
    );
    
    // If no exact match for month, find the closest month in the same year
    if (foundIndex === -1) {
      // Get all photos from the target year
      const yearPhotos = sortedPhotos.current.filter(photo => photo.year === targetYear);
      
      if (yearPhotos.length > 0) {
        // Find photo with closest month
        const closestPhoto = yearPhotos.reduce((closest, photo) => {
          const currentDiff = Math.abs(photo.month - targetMonth);
          const closestDiff = Math.abs(closest.month - targetMonth);
          return currentDiff < closestDiff ? photo : closest;
        });
        
        foundIndex = sortedPhotos.current.findIndex(
          photo => photo.id === closestPhoto.id
        );
      }
    }
    
    // If still no match, fallback to just finding the first photo of the year
    if (foundIndex === -1) {
      foundIndex = sortedPhotos.current.findIndex(photo => photo.year === targetYear);
    }
    
    // Update index if found
    if (foundIndex >= 0) {
      setCurrentIndex(foundIndex);
    }
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

  // Set up keyboard event listeners for arrow keys
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Only ignore keyboard events from form inputs where arrow keys might be needed for text navigation
      if (
        (e.target instanceof HTMLInputElement && e.target.type === "text") ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }
      
      if (e.key === "ArrowRight") {
        e.preventDefault();
        nextPhoto();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        prevPhoto();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [nextPhoto, prevPhoto]);

  return {
    currentPhoto,
    currentIndex,
    setCurrentIndex,
    nextPhoto,
    prevPhoto,
    jumpToYear,
    getPosition,
    getNavigationDirection: () => lastDirection.current,
    totalPhotos: sortedPhotos.current.length,
    setKeyboardNavigationActive
  };
} 