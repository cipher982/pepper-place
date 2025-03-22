import { useState, useEffect, useRef, useCallback } from "react";
import { Photo, TimelinePeriod, MinioConfig } from "../types";
import PhotoService from "../services/PhotoService";

// Default config
const DEFAULT_CONFIG: MinioConfig = {
  endpoint: process.env.REACT_APP_S3_ENDPOINT || "",
  bucket: process.env.REACT_APP_S3_BUCKET || "",
};

// Simplified hook with error states
const usePhotoData = (config: MinioConfig = DEFAULT_CONFIG) => {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [timeline, setTimeline] = useState<TimelinePeriod[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  
  // Service ref to avoid recreation
  const photoServiceRef = useRef<PhotoService | null>(null);
  
  // Track the last bucket used for automatic refresh
  const lastBucketRef = useRef<string>(config.bucket);
  
  // Loading state
  const isLoadingData = useRef(false);
  
  // Create the load data function with useCallback to prevent recreation
  const loadData = useCallback(async () => {
    // Prevent multiple concurrent loads
    if (isLoadingData.current) {
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
      
      // Set initial year to the most recent year with photos
      if (timelineData.length > 0) {
        const years = timelineData.map(period => period.year);
        const latestYear = Math.max(...years);
        setCurrentYear(latestYear);
      }
    } catch (err) {
      console.error("Error loading photo data:", err);
      setError("Failed to load photos. Please check your connection and storage configuration.");
    } finally {
      setLoading(false);
      isLoadingData.current = false;
    }
  }, [config]);
  
  // Function to force refresh by clearing cache and reloading
  const refreshData = useCallback(async () => {
    if (photoServiceRef.current) {
      // Clear the cache
      photoServiceRef.current.clearCache();
      // Re-initialize the service with current config
      photoServiceRef.current = new PhotoService(config);
    } else {
      // Create a new service if it doesn't exist
      photoServiceRef.current = new PhotoService(config);
    }
    
    // Load fresh data
    await loadData();
  }, [config, loadData]);
  
  useEffect(() => {
    // Check if bucket has changed
    if (config.bucket !== lastBucketRef.current) {
      console.log(`Bucket changed from ${lastBucketRef.current} to ${config.bucket}, refreshing data...`);
      // Update the ref
      lastBucketRef.current = config.bucket;
      // Refresh data when bucket changes
      refreshData();
    } else {
      // Normal load on initial mount or other config changes
      loadData();
    }
    
    // Cleanup function
    return () => {
      // Cancel any pending operations if component unmounts
      photoServiceRef.current = null;
    };
  }, [config, loadData, refreshData]);
  
  return {
    photos,
    timeline,
    loading,
    error,
    currentYear,
    setCurrentYear,
    refreshData
  };
};

export default usePhotoData; 