import React, { useState, useMemo, useEffect } from "react";
import Timeline from "./components/Timeline";
import PhotoGallery from "./components/PhotoGallery";
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

function App() {
  // Use useMemo to prevent config recreation on each render
  const minioConfig = useMemo(() => ({
    endpoint: process.env.REACT_APP_S3_ENDPOINT || "http://localhost:9000",
    bucket: process.env.REACT_APP_S3_BUCKET || "pepper-photos-simple",
  }), []);
  
  const { photos, timeline, loading, error } = usePhotoData(minioConfig);
  
  // State to track if year change is coming from timeline vs photo nav
  const [isUserDraggingTimeline, setIsUserDraggingTimeline] = useState(false);
  
  // Initialize photo navigation hook to manage global photo index
  const {
    currentPhoto,
    currentIndex,
    jumpToYear,
    getPosition
  } = usePhotoNavigation({ photos });
  
  // Current year is derived from the current photo in the navigation
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  
  // Update current year when current photo changes - only if not dragging timeline
  useEffect(() => {
    // Skip if explicitly changing via timeline or photo isn't loaded yet
    if (isUserDraggingTimeline || !currentPhoto) {
      if (!currentPhoto && timeline.length > 0) {
        // If no current photo but we have timeline data, use the most recent year
        const years = timeline.map(period => period.year);
        const latestYear = Math.max(...years);
        setCurrentYear(latestYear);
      }
      return;
    }
    
    // Update the year if it's different
    if (currentYear !== currentPhoto.year) {
      setCurrentYear(currentPhoto.year);
    }
  }, [currentPhoto, timeline, currentYear, isUserDraggingTimeline]);
  
  // Handle year change from Timeline component - direct and simple
  const handleYearChange = (year: number) => {
    setIsUserDraggingTimeline(true);
    setCurrentYear(year);
    jumpToYear(year);
    // Reset the drag flag after a short delay
    setTimeout(() => setIsUserDraggingTimeline(false), 100);
  };

  // Get position information
  const position = getPosition();

  return (
    <AppContainer>
      <Header>
        <h1>Pepper Through the Years</h1>
        <p>A timeline of our amazing dog's adventures</p>
      </Header>
      
      {loading ? (
        <LoadingState>Loading Pepper's photos...</LoadingState>
      ) : error ? (
        <ErrorState>{error}</ErrorState>
      ) : (
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
            // Don't pass initialYear to avoid another source of updates
            // initialYear={currentYear}
            // Don't pass onYearChange to avoid circular updates
            // onYearChange={(year) => {...}}
          />
        </TimelineGalleryContainer>
      )}
      
      <Footer>
        <p>Created with love for Pepper 🐾</p>
      </Footer>
    </AppContainer>
  );
}

export default App; 