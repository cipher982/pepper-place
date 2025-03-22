import React, { useState, useMemo } from "react";
import styled from "styled-components";
import Timeline from "./components/Timeline";
import PhotoGallery from "./components/PhotoGallery";
import usePhotoData from "./hooks/usePhotoData";
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
  
  const { photos, timeline, loading, error, currentYear, setCurrentYear } = usePhotoData(minioConfig);

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
            onYearChange={setCurrentYear}
          />
          
          <PhotoGallery 
            photos={photos} 
            year={currentYear} 
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