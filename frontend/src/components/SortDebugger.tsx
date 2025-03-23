import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Photo } from "../types";

interface SortDebuggerProps {
  photos: Photo[];
}

const DebugContainer = styled.div`
  position: fixed;
  top: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.8);
  color: #00ff00;
  padding: 15px;
  border-radius: 5px;
  max-width: 800px;
  max-height: 90vh;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  z-index: 1000;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
`;

const ToggleButton = styled.button`
  position: fixed;
  top: 10px;
  left: 10px;
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

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-gap: 10px;
  margin-top: 10px;
`;

const Column = styled.div`
  background-color: rgba(0, 0, 0, 0.5);
  padding: 10px;
  border-radius: 5px;
`;

const PhotoEntry = styled.div<{ isCurrentYear?: boolean }>`
  margin-bottom: 5px;
  font-size: 11px;
  line-height: 1.3;
  ${props => props.isCurrentYear && `background-color: rgba(255, 255, 0, 0.2);`}
`;

const Title = styled.h3`
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #00ff00;
  text-align: center;
`;

// Simplified photo data for display
type SimplePhoto = {
  id: string;
  year: number;
  month: number;
  path: string;
};

const SortDebugger: React.FC<SortDebuggerProps> = ({ photos }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [originalPhotos, setOriginalPhotos] = useState<SimplePhoto[]>([]);
  const [chronologicalPhotos, setChronologicalPhotos] = useState<SimplePhoto[]>([]);
  const [reverseChronologicalPhotos, setReverseChronologicalPhotos] = useState<SimplePhoto[]>([]);
  
  // Simplify photo object for display
  const simplifyPhoto = (photo: Photo): SimplePhoto => {
    const parts = photo.url.split("/");
    const path = parts.slice(-3).join("/");
    return {
      id: photo.id.substring(0, 8) + "...",
      year: photo.year,
      month: photo.month,
      path
    };
  };
  
  // Process photos when they change
  useEffect(() => {
    if (photos.length === 0) return;
    
    // Original order (as received from API)
    setOriginalPhotos(photos.slice(0, 15).map(simplifyPhoto));
    
    // Sort chronologically (oldest first)
    const chronological = [...photos].sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
    setChronologicalPhotos(chronological.slice(0, 15).map(simplifyPhoto));
    
    // Sort reverse chronologically (newest first)
    const reverseChronological = [...photos].sort((a, b) => {
      if (a.year !== b.year) return b.year - a.year;
      return b.month - a.month;
    });
    setReverseChronologicalPhotos(reverseChronological.slice(0, 15).map(simplifyPhoto));
    
  }, [photos]);
  
  if (!isVisible) {
    return <ToggleButton onClick={() => setIsVisible(true)}>Sort Debug</ToggleButton>;
  }
  
  // Check for path to metadata inconsistencies
  const findInconsistencies = () => {
    const inconsistentPhotos = photos.filter(photo => {
      const parts = photo.url.split("/");
      if (parts.length < 4) return false;
      
      const pathYear = parseInt(parts[parts.length - 3], 10);
      const pathMonth = parseInt(parts[parts.length - 2], 10);
      
      return (isNaN(pathYear) || isNaN(pathMonth) || 
              pathYear !== photo.year || pathMonth !== photo.month);
    });
    
    return inconsistentPhotos.slice(0, 5).map(simplifyPhoto);
  };

  return (
    <DebugContainer>
      <ToggleButton onClick={() => setIsVisible(false)}>Hide</ToggleButton>
      
      <div>
        <h2 style={{ margin: "0 0 10px 0", textAlign: "center" }}>Photo Sorting Debugger</h2>
        <div style={{ marginBottom: "15px" }}>
          <strong>Total Photos:</strong> {photos.length}
        </div>
        
        <div style={{ marginBottom: "15px" }}>
          <strong>Inconsistent Path/Metadata:</strong>
          <div style={{ marginTop: "5px" }}>
            {findInconsistencies().map((photo, index) => (
              <PhotoEntry key={index}>
                {photo.year}-{photo.month.toString().padStart(2, "0")} (Metadata) | 
                {photo.path} (Path)
              </PhotoEntry>
            ))}
            {findInconsistencies().length === 0 && "No inconsistencies found"}
          </div>
        </div>
        
        <Grid>
          <Column>
            <Title>Original Order</Title>
            {originalPhotos.map((photo, index) => (
              <PhotoEntry key={index}>
                {index+1}. {photo.year}-{photo.month.toString().padStart(2, "0")} | {photo.path}
              </PhotoEntry>
            ))}
          </Column>
          
          <Column>
            <Title>Chronological (Oldest First)</Title>
            {chronologicalPhotos.map((photo, index) => (
              <PhotoEntry key={index}>
                {index+1}. {photo.year}-{photo.month.toString().padStart(2, "0")} | {photo.path}
              </PhotoEntry>
            ))}
          </Column>
          
          <Column>
            <Title>Reverse Chronological (Newest First)</Title>
            {reverseChronologicalPhotos.map((photo, index) => (
              <PhotoEntry key={index}>
                {index+1}. {photo.year}-{photo.month.toString().padStart(2, "0")} | {photo.path}
              </PhotoEntry>
            ))}
          </Column>
        </Grid>
      </div>
    </DebugContainer>
  );
};

export default SortDebugger; 