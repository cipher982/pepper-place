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

  // Navigate to next photo
  const nextPhoto = useCallback(() => {
    if (sortedPhotos.current.length === 0) return;
    
    lastDirection.current = "forward";
    setCurrentIndex(prevIndex => 
      prevIndex + 1 >= sortedPhotos.current.length ? 0 : prevIndex + 1);
  }, []);

  // Navigate to previous photo
  const prevPhoto = useCallback(() => {
    if (sortedPhotos.current.length === 0) return;
    
    lastDirection.current = "backward";
    setCurrentIndex(prevIndex => 
      prevIndex - 1 < 0 ? sortedPhotos.current.length - 1 : prevIndex - 1);
  }, []);

  // Jump to specific year - simplified approach
  const jumpToYear = useCallback((yearValue: number) => {
    if (sortedPhotos.current.length === 0) return;
    
    // For integer year values, find the first photo of that year
    const targetYear = Math.floor(yearValue);
    const yearIndex = sortedPhotos.current.findIndex(photo => photo.year === targetYear);
    
    if (yearIndex >= 0) {
      setCurrentIndex(yearIndex);
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
      // Ignore keyboard events from form elements
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
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
    totalPhotos: sortedPhotos.current.length
  };
} 