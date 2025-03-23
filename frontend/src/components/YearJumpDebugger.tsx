import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Photo, TimelinePeriod } from "../types";

interface YearJumpDebuggerProps {
  photos: Photo[];
  timeline: TimelinePeriod[];
  currentYear: number;
  onYearChange: (year: number) => void;
}

const DebuggerContainer = styled.div`
  position: fixed;
  top: 10px;
  right: 10px;
  background-color: rgba(0, 0, 0, 0.8);
  color: #00ff00;
  padding: 15px;
  border-radius: 5px;
  max-width: 400px;
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

const YearButton = styled.button<{ isActive: boolean }>`
  margin: 4px;
  padding: 5px 10px;
  background-color: ${props => props.isActive ? "rgba(0, 255, 0, 0.3)" : "rgba(0, 0, 0, 0.5)"};
  color: #ffffff;
  border: 1px solid ${props => props.isActive ? "#00ff00" : "#444"};
  border-radius: 4px;
  cursor: pointer;
  
  &:hover {
    background-color: ${props => props.isActive ? "rgba(0, 255, 0, 0.4)" : "rgba(0, 0, 0, 0.7)"};
  }
`;

const Section = styled.div`
  margin-bottom: 15px;
  border-bottom: 1px solid #333;
  padding-bottom: 10px;
`;

const Title = styled.h3`
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #00ff00;
`;

const JumpLog = styled.div`
  margin-top: 8px;
  max-height: 150px;
  overflow-y: auto;
  background-color: rgba(0, 0, 0, 0.5);
  padding: 5px;
  border-radius: 3px;
`;

const LogEntry = styled.div`
  margin-bottom: 3px;
  font-size: 11px;
  border-bottom: 1px dotted #333;
  padding-bottom: 3px;
`;

const YearJumpDebugger: React.FC<YearJumpDebuggerProps> = ({
  photos,
  timeline,
  currentYear,
  onYearChange
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [jumpLog, setJumpLog] = useState<string[]>([]);
  
  // Find all unique years in photos
  const uniqueYears = React.useMemo(() => {
    const years = new Set<number>();
    photos.forEach(photo => years.add(photo.year));
    return Array.from(years).sort((a, b) => a - b);
  }, [photos]);
  
  // Handle year button click
  const handleYearClick = (year: number) => {
    const timestamp = new Date().toISOString().substring(11, 23);
    setJumpLog(prev => [`${timestamp} - Jumping to year: ${year}`, ...prev].slice(0, 20));
    onYearChange(year);
  };
  
  // Log currentYear changes
  useEffect(() => {
    const timestamp = new Date().toISOString().substring(11, 23);
    setJumpLog(prev => [`${timestamp} - Current year changed to: ${currentYear}`, ...prev].slice(0, 20));
  }, [currentYear]);
  
  // Find first photo for each year
  const findFirstPhotoByYear = (targetYear: number) => {
    // Find index of first photo with this year
    const index = photos.findIndex(photo => photo.year === targetYear);
    if (index === -1) return null;
    
    // Get the photo
    const photo = photos[index];
    
    return {
      index,
      id: photo.id,
      year: photo.year,
      month: photo.month
    };
  };
  
  if (!isVisible) {
    return <ToggleButton onClick={() => setIsVisible(true)}>Year Debug</ToggleButton>;
  }

  return (
    <DebuggerContainer>
      <ToggleButton onClick={() => setIsVisible(false)}>Hide</ToggleButton>
      
      <div>
        <Title>Year Navigation Debugger</Title>
        
        <Section>
          <div><strong>Current Year:</strong> {currentYear}</div>
          <div><strong>Total Photos:</strong> {photos.length}</div>
          <div><strong>Total Timeline Periods:</strong> {timeline.length}</div>
        </Section>
        
        <Section>
          <Title>Jump to Year</Title>
          <div style={{ display: "flex", flexWrap: "wrap" }}>
            {uniqueYears.map(year => (
              <YearButton
                key={year}
                isActive={year === currentYear}
                onClick={() => handleYearClick(year)}
              >
                {year}
              </YearButton>
            ))}
          </div>
        </Section>
        
        <Section>
          <Title>First Photo by Year</Title>
          <div>
            {uniqueYears.map(year => {
              const firstPhoto = findFirstPhotoByYear(year);
              return (
                <div key={year} style={{ marginBottom: "5px" }}>
                  <strong>{year}:</strong>{" "}
                  {firstPhoto 
                    ? `Index ${firstPhoto.index} - ${firstPhoto.year}-${firstPhoto.month.toString().padStart(2, "0")}`
                    : "No photos found"}
                </div>
              );
            })}
          </div>
        </Section>
        
        <Section>
          <Title>Jump Log</Title>
          <JumpLog>
            {jumpLog.map((entry, index) => (
              <LogEntry key={index}>{entry}</LogEntry>
            ))}
          </JumpLog>
        </Section>
      </div>
    </DebuggerContainer>
  );
};

export default YearJumpDebugger; 