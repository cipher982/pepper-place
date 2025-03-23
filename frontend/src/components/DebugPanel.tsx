import React, { useState } from "react";
import styled from "styled-components";
import { Photo, TimelinePeriod } from "../types";

interface DebugPanelProps {
  photos: Photo[];
  timeline: TimelinePeriod[];
  currentPhoto: Photo | undefined;
  currentIndex: number;
}

const DebugContainer = styled.div`
  position: fixed;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.8);
  color: #00ff00;
  padding: 15px;
  border-radius: 5px;
  max-width: 500px;
  max-height: 500px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  z-index: 1000;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
`;

const ToggleButton = styled.button`
  position: fixed;
  bottom: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.8);
  color: #00ff00;
  border: 1px solid #00ff00;
  border-radius: 5px;
  padding: 5px 10px;
  cursor: pointer;
  z-index: 1001;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.9);
  }
`;

const Section = styled.div`
  margin-bottom: 10px;
  border-bottom: 1px solid #333;
  padding-bottom: 10px;
`;

const Title = styled.h3`
  margin: 0 0 5px 0;
  font-size: 14px;
  color: #00ff00;
`;

const DebugPanel: React.FC<DebugPanelProps> = ({
  photos,
  timeline,
  currentPhoto,
  currentIndex,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  
  // Only show first 5 photos for brevity
  const samplePhotos = photos.slice(0, 5);
  
  // Check photo sorting (both by path and by metadata)
  const checkPhotoSorting = () => {
    if (photos.length < 2) return "Not enough photos to check sorting";
    
    // Check if sorted by year/month metadata
    const isSortedByYearMonth = photos.every((photo, i) => {
      if (i === 0) return true;
      const prev = photos[i - 1];
      return (prev.year > photo.year) || 
             (prev.year === photo.year && prev.month >= photo.month);
    });
    
    // Check if paths match metadata
    const metadataMatchesPaths = photos.every(photo => {
      const parts = photo.url.split("/");
      if (parts.length < 4) return true;
      
      const pathYear = parseInt(parts[parts.length - 3], 10);
      const pathMonth = parseInt(parts[parts.length - 2], 10);
      
      return !isNaN(pathYear) && !isNaN(pathMonth) && 
             pathYear === photo.year && pathMonth === photo.month;
    });
    
    return `Sorted by year/month: ${isSortedByYearMonth ? "✓" : "✗"}, 
            Metadata matches paths: ${metadataMatchesPaths ? "✓" : "✗"}`;
  };

  if (!isVisible) {
    return <ToggleButton onClick={() => setIsVisible(true)}>Debug</ToggleButton>;
  }

  return (
    <DebugContainer>
      <ToggleButton onClick={() => setIsVisible(false)}>Hide</ToggleButton>
      
      <Section>
        <Title>Current Photo</Title>
        {currentPhoto ? (
          <pre>
            {JSON.stringify(
              {
                id: currentPhoto.id,
                year: currentPhoto.year,
                month: currentPhoto.month,
                url: currentPhoto.url,
                index: currentIndex,
              },
              null,
              2
            )}
          </pre>
        ) : (
          "No current photo"
        )}
      </Section>
      
      <Section>
        <Title>Sorting Check</Title>
        <div>{checkPhotoSorting()}</div>
      </Section>
      
      <Section>
        <Title>Sample Photos ({Math.min(5, photos.length)} of {photos.length})</Title>
        <pre>
          {JSON.stringify(
            samplePhotos.map(p => ({
              id: p.id,
              year: p.year,
              month: p.month,
              path: p.url.split("/").slice(-3).join("/")
            })),
            null,
            2
          )}
        </pre>
      </Section>
      
      <Section>
        <Title>Timeline Data</Title>
        <pre>{JSON.stringify(timeline, null, 2)}</pre>
      </Section>
    </DebugContainer>
  );
};

export default DebugPanel; 