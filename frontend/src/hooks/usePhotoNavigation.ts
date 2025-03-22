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

  // Navigate to next photo - simplified
  const nextPhoto = useCallback(() => {
    if (sortedPhotos.current.length === 0) return;
    
    // Set direction and update index
    lastDirection.current = "forward";
    
    // Update the index
    setCurrentIndex(prevIndex => {
      return prevIndex + 1 >= sortedPhotos.current.length ? 0 : prevIndex + 1;
    });
  }, []);

  // Navigate to previous photo - simplified
  const prevPhoto = useCallback(() => {
    if (sortedPhotos.current.length === 0) return;
    
    // Set direction
    lastDirection.current = "backward";
    
    // Update the index
    setCurrentIndex(prevIndex => {
      return prevIndex - 1 < 0 ? sortedPhotos.current.length - 1 : prevIndex - 1;
    });
  }, []);

  // Jump to specific year - simplified to focus on finding the right photo
  const jumpToYear = useCallback((yearValue: number) => {
    if (sortedPhotos.current.length === 0) return;
    
    // For integer year values, find the first photo of that year
    if (Number.isInteger(yearValue)) {
      const yearIndex = sortedPhotos.current.findIndex(photo => photo.year === yearValue);
      if (yearIndex >= 0) {
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
    
    if (bestMatchIndex >= 0) {
      setCurrentIndex(bestMatchIndex);
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
      // Ignore keyboard events if the event originates from an input or contentEditable element
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      ) {
        return;
      }
      
      // Use the raw event, not a synthetic one
      if (e.key === "ArrowRight") {
        e.preventDefault(); // Prevent default browser behavior
        nextPhoto();
      } else if (e.key === "ArrowLeft") {
        e.preventDefault(); // Prevent default browser behavior
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