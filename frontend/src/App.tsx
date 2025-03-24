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
  
  // Flag to track if year change is from timeline vs photo navigation
  const [isUserDraggingTimeline, setIsUserDraggingTimeline] = useState(false);
  
  // Photo navigation hook
  const {
    currentPhoto,
    currentIndex,
    jumpToYear,
    getPosition
  } = usePhotoNavigation({ photos });
  
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
  
  // Update current year based on currentPhoto (but only when not dragging timeline)
  useEffect(() => {
    if (isUserDraggingTimeline || !currentPhoto) {
      return;
    }
    
    // Update the year if different from current photo
    if (currentYear !== currentPhoto.year) {
      setCurrentYear(currentPhoto.year);
    }
  }, [currentPhoto, currentYear, isUserDraggingTimeline]);
  
  // Handle year change from Timeline
  const handleYearChange = (year: number) => {
    setIsUserDraggingTimeline(true);
    setCurrentYear(year);
    jumpToYear(year);
    // Reset the drag flag after a short delay
    setTimeout(() => setIsUserDraggingTimeline(false), 100);
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