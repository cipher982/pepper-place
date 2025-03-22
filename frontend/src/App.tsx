import React, { useState, useEffect, useMemo } from "react";
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
  // Use config from environment variables
  const minioConfig = useMemo(() => ({
    endpoint: process.env.REACT_APP_S3_ENDPOINT || "http://localhost:9000",
    bucket: process.env.REACT_APP_S3_BUCKET || "pepper-photos-simple",
  }), []);
  
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
  
  // Current year derived from the current photo
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  
  // Update current year when photo changes (if not dragging timeline)
  useEffect(() => {
    if (isUserDraggingTimeline || !currentPhoto) {
      if (!currentPhoto && timeline.length > 0) {
        // Without a current photo, use the most recent year from timeline
        const years = timeline.map(period => period.year);
        const latestYear = Math.max(...years);
        setCurrentYear(latestYear);
      }
      return;
    }
    
    // Update the year if different from current photo
    if (currentYear !== currentPhoto.year) {
      setCurrentYear(currentPhoto.year);
    }
  }, [currentPhoto, timeline, currentYear, isUserDraggingTimeline]);
  
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
        
        <PhotoGallery photos={photos} />
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