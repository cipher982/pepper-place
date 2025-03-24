import React, { useState, useEffect, useMemo } from "react";
import Timeline from "./components/Timeline";
import PhotoGallery from "./components/PhotoGallery";
import DebugPanel from "./components/DebugPanel";
import SortDebugger from "./components/SortDebugger";
import MetadataChecker from "./components/MetadataChecker";
import YearJumpDebugger from "./components/YearJumpDebugger";
import usePhotoData from "./hooks/usePhotoData";
import usePhotoNavigation from "./hooks/usePhotoNavigation";
import { 
  AppContainer, 
  Header, 
  Footer, 
  LoadingState, 
  ErrorState,
  TimelineGalleryContainer 
} from "./styles/App.styles";

// Enable debug mode with query param (e.g., ?debug=true)
const isDebugMode = (() => {
  if (typeof window !== "undefined") {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get("debug") === "true";
  }
  return false;
})();

function App() {
  // Use config from environment variables
  const minioConfig = useMemo(() => {
    if (!process.env.REACT_APP_S3_ENDPOINT || !process.env.REACT_APP_S3_BUCKET) {
      throw new Error("Missing required environment variables: REACT_APP_S3_ENDPOINT and REACT_APP_S3_BUCKET must be set");
    }
    return {
      endpoint: process.env.REACT_APP_S3_ENDPOINT,
      bucket: process.env.REACT_APP_S3_BUCKET,
    };
  }, []);
  
  const { photos, timeline, loading, error } = usePhotoData(minioConfig);
  
  // Flag to track navigation source: either "timeline" or "keyboard" or null
  const [navigationSource, setNavigationSource] = useState<"timeline" | "keyboard" | null>(null);
  
  // Photo navigation hook
  const {
    currentPhoto,
    currentIndex,
    jumpToYear,
    getPosition,
    setCurrentIndex
  } = usePhotoNavigation({ 
    photos,
    onNavigationChange: (isKeyboardActive) => {
      // When keyboard navigation occurs, set the source
      setNavigationSource(isKeyboardActive ? "keyboard" : null);
    }
  });
  
  // Current year derived from the current photo - use 2014 as default (first year)
  const [currentYear, setCurrentYear] = useState<number>(2014);
  
  // Update current year when photos and timeline are loaded
  useEffect(() => {
    // Only run this once when photos and timeline are first loaded
    if (photos.length && timeline.length) {
      // Start with the earliest year
      const years = timeline.map(period => period.year);
      const earliestYear = Math.min(...years);
      setCurrentYear(earliestYear);
      
      // Jump to that year in the photo viewer
      jumpToYear(earliestYear);
    }
  }, [photos.length, timeline.length, jumpToYear, timeline]);
  
  // Update current year based on currentPhoto (but only when not from timeline)
  useEffect(() => {
    if (navigationSource === "timeline" || !currentPhoto) {
      return;
    }
    
    // Create a precise year value with month fraction
    const photoYearValue = currentPhoto.year + (currentPhoto.month - 1) / 12;
    setCurrentYear(photoYearValue);
  }, [currentPhoto, navigationSource]);
  
  // Handle year change from Timeline
  const handleYearChange = (year: number) => {
    setNavigationSource("timeline");
    // Preserve the fractional part representing months
    setCurrentYear(year);
    jumpToYear(year);
    // Reset the navigation source after a delay
    setTimeout(() => {
      console.log("Resetting navigationSource from", "timeline", "to null");
      setNavigationSource(null);
    }, 300);
  };

  // Get position information for indicator
  const position = getPosition();

  // Render app content based on loading/error state
  const renderContent = () => {
    if (loading) {
      return <LoadingState>Loading Pepper's photos...</LoadingState>;
    }
    
    if (error) {
      return <ErrorState>{error}</ErrorState>;
    }
    
    return (
      <TimelineGalleryContainer>
        <Timeline 
          periods={timeline} 
          currentYear={currentYear}
          onYearChange={handleYearChange}
          currentPhotoIndex={position.index}
          totalPhotos={position.total}
        />
        
        <PhotoGallery 
          photos={photos} 
          initialYear={currentYear}
          onYearChange={handleYearChange}
          navigationSource={navigationSource}
          currentIndex={currentIndex}
          setCurrentIndex={setCurrentIndex}
          currentPhoto={currentPhoto}
        />
        
        {/* Debug components - only shown in debug mode */}
        {isDebugMode && (
          <>
            <DebugPanel 
              photos={photos}
              timeline={timeline}
              currentPhoto={currentPhoto}
              currentIndex={currentIndex}
            />
            <SortDebugger photos={photos} />
            <MetadataChecker photos={photos} />
            <YearJumpDebugger
              photos={photos}
              timeline={timeline}
              currentYear={currentYear}
              onYearChange={handleYearChange}
            />
          </>
        )}
      </TimelineGalleryContainer>
    );
  };

  return (
    <AppContainer>
      <Header>
        <h1>Pepper Through the Years</h1>
        <p>A timeline of our amazing dog's adventures</p>
      </Header>
      
      {renderContent()}
      
      <Footer>
        <p>Created with love for Pepper 🐾</p>
      </Footer>
    </AppContainer>
  );
}

export default App; 