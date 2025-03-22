import { useState, useEffect, useRef, useCallback } from "react";
import { Photo, TimelinePeriod, MinioConfig } from "../types";
import PhotoService from "../services/PhotoService";

// This could come from env variables in a real app
const DEFAULT_CONFIG: MinioConfig = {
  endpoint: process.env.REACT_APP_S3_ENDPOINT || "",
  bucket: process.env.REACT_APP_S3_BUCKET || "",
};

const usePhotoData = (config: MinioConfig = DEFAULT_CONFIG) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [timeline, setTimeline] = useState<TimelinePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  const retryCount = useRef(0);
  const maxRetries = 3;
  const hasLoadedData = useRef(false);
  const isLoadingData = useRef(false);
  const photoServiceRef = useRef<PhotoService | null>(null);
  
  // Create the load data function with useCallback to prevent recreation
  const loadData = useCallback(async () => {
    // Prevent multiple concurrent loads
    if (isLoadingData.current) {
      return;
    }
    
    // Don't retry if we've already hit the limit
    if (retryCount.current >= maxRetries) {
      setLoading(false);
      setError("Failed to connect to photo storage after multiple attempts. Please check your connection or try again later.");
      return;
    }
    
    isLoadingData.current = true;
    setLoading(true);
    setError(null);
    
    try {
      // Ensure we have a PhotoService instance
      if (!photoServiceRef.current) {
        photoServiceRef.current = new PhotoService(config);
      }
      
      const photoService = photoServiceRef.current;
      
      // Load photos and timeline data
      const photoData = await photoService.listPhotos();
      const timelineData = await photoService.getTimeline();
      
      setPhotos(photoData);
      setTimeline(timelineData);
      hasLoadedData.current = true;
      
      // Set initial year to the most recent year with photos
      if (timelineData.length > 0) {
        const years = timelineData.map(period => period.year);
        const latestYear = Math.max(...years);
        setCurrentYear(latestYear);
      }
    } catch (err) {
      console.error("Error loading photo data:", err);
      retryCount.current += 1;
      
      if (retryCount.current >= maxRetries) {
        setError(`Failed to load photos after ${maxRetries} attempts. Please check your connection and storage configuration.`);
      } else {
        setError(`Connection issue (attempt ${retryCount.current}/${maxRetries}). Retrying...`);
        // Only retry if we haven't loaded data yet and haven't hit the limit
        if (!hasLoadedData.current) {
          setTimeout(loadData, 2000); // Retry after 2 seconds
        }
      }
    } finally {
      setLoading(false);
      isLoadingData.current = false;
    }
  }, [config, maxRetries]);
  
  useEffect(() => {
    // Only load data on initial mount or config changes
    loadData();
    
    // Cleanup function
    return () => {
      // Cancel any pending operations if component unmounts
      photoServiceRef.current = null;
    };
  }, [loadData]);
  
  return {
    photos,
    timeline,
    loading,
    error,
    currentYear,
    setCurrentYear
  };
};

export default usePhotoData; 