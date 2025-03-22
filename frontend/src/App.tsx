import React, { useState, useMemo, useEffect } from "react";
import styled from "styled-components";
import Timeline from "./components/Timeline";
import PhotoGallery from "./components/PhotoGallery";
import usePhotoData from "./hooks/usePhotoData";
import usePhotoNavigation from "./hooks/usePhotoNavigation";
import "./App.css";

const AppContainer = styled.div`
  font-family: "Roboto", sans-serif;
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
`;

const Header = styled.header`
  text-align: center;
  margin-bottom: 30px;
  
  h1 {
    font-size: 2.5rem;
    color: #333;
    margin-bottom: 5px;
  }
  
  p {
    font-size: 1.2rem;
    color: #666;
  }
`;

const Footer = styled.footer`
  text-align: center;
  margin-top: 40px;
  padding: 20px;
  color: #666;
  font-size: 0.9rem;
`;

const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  font-size: 1.2rem;
  color: #666;
`;

const ErrorState = styled.div`
  background-color: #ffebee;
  padding: 20px;
  border-radius: 4px;
  margin: 20px 0;
  color: #c62828;
`;

const TimelineGalleryContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
`;

function App() {
  // Use useMemo to prevent config recreation on each render
  const minioConfig = useMemo(() => ({
    endpoint: process.env.REACT_APP_S3_ENDPOINT || "http://localhost:9000",
    bucket: process.env.REACT_APP_S3_BUCKET || "pepper-photos-simple",
  }), []);
  
  const { photos, timeline, loading, error } = usePhotoData(minioConfig);
  
  // Initialize photo navigation hook to manage global photo index
  const {
    currentPhoto,
    currentIndex,
    jumpToYear,
    getPosition
  } = usePhotoNavigation({ photos });
  
  // Current year is derived from the current photo in the navigation
  const [currentYear, setCurrentYear] = useState<number>(new Date().getFullYear());
  
  // Update current year when current photo changes - simplified
  useEffect(() => {
    // Skip if photo isn't loaded yet
    if (!currentPhoto) {
      if (timeline.length > 0) {
        // If no current photo but we have timeline data, use the most recent year
        const years = timeline.map(period => period.year);
        const latestYear = Math.max(...years);
        setCurrentYear(latestYear);
      }
      return;
    }
    
    // Simply update the year if it's different
    if (currentYear !== currentPhoto.year) {
      setCurrentYear(currentPhoto.year);
    }
  }, [currentPhoto, timeline, currentYear]);
  
  // Handle year change from Timeline component - direct and simple
  const handleYearChange = (year: number) => {
    jumpToYear(year);
    // After jumping, the current photo will change, which will update currentYear through the effect above
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
            initialYear={currentYear}
            onYearChange={(year) => {
              // Only update if needed to avoid circular updates
              if (year !== currentYear) {
                setCurrentYear(year);
              }
            }}
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