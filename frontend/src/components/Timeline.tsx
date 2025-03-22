import React, { useState, useEffect, useRef } from "react";
import ReactSlider from "react-slider";
import styled from "styled-components";
import { TimelinePeriod } from "../types";

interface TimelineProps {
  periods: TimelinePeriod[];
  currentYear: number;
  onYearChange: (year: number) => void;
  currentPhotoIndex?: number;
  totalPhotos?: number;
}

const StyledThumb = styled.div`
  height: 40px;
  width: 40px;
  background-color: #ff6b6b;
  border-radius: 50%;
  cursor: grab;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
  font-weight: bold;
  top: -10px;
  position: relative;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
  
  &:focus {
    outline: none;
  }
  
  &:active {
    cursor: grabbing;
    transform: scale(1.1);
  }
`;

const StyledTrack = styled.div<{ $index: number }>`
  top: 10px;
  bottom: 10px;
  background: ${props => props.$index === 1 ? "#ddd" : "#83a4d4"};
  border-radius: 999px;
  position: relative;
`;

const YearMarker = styled.div<{ $active: boolean }>`
  position: absolute;
  font-size: 12px;
  color: ${props => props.$active ? "#ff6b6b" : "#666"};
  bottom: -25px;
  transform: translateX(-50%);
  font-weight: ${props => props.$active ? "bold" : "normal"};
  z-index: 1;
  background-color: rgba(255, 255, 255, 0.7);
  padding: 2px 5px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.2s ease;
  
  &:hover {
    color: #ff6b6b;
    transform: translateX(-50%) scale(1.1);
  }
`;

const TickMark = styled.div`
  position: absolute;
  width: 2px;
  height: 8px;
  background-color: #aaa;
  bottom: -4px;
  transform: translateX(-50%);
`;

const YearTooltip = styled.div`
  position: absolute;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 6px 10px;
  border-radius: 4px;
  font-size: 14px;
  bottom: 50px;
  transform: translateX(-50%);
  z-index: 10;
  pointer-events: none;
  white-space: nowrap;
`;

const StyledSlider = styled(ReactSlider)`
  width: 100%;
  height: 40px;
  margin-top: 20px;
`;

// A separate wrapper component to handle the ReactSlider type constraints
const TimelineSlider: React.FC<{
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (value: number) => void;
  onSliderChange?: (value: number) => void;
  displayYear: string;
  years: number[];
}> = ({ min, max, step, value, onChange, onSliderChange, displayYear, years }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  const [tooltipValue, setTooltipValue] = useState(displayYear);
  
  const handleChange = (newValue: number | readonly number[]) => {
    onChange(newValue as number);
    if (onSliderChange) {
      onSliderChange(newValue as number);
    }
  };

  const renderThumb = (props: any) => {
    const { key, ...restProps } = props;
    return (
      <StyledThumb 
        key={key} 
        {...restProps}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onMouseMove={(e) => {
          // Update tooltip position to match the cursor
          const rect = e.currentTarget.getBoundingClientRect();
          setTooltipPosition(rect.left + rect.width / 2);
        }}
      >
        {displayYear.split(" ")[0]}
      </StyledThumb>
    );
  };

  const renderTrack = (props: any, state: { index: number }) => {
    const { key, ...restProps } = props;
    return <StyledTrack key={key} {...restProps} $index={state.index} />;
  };

  return (
    <div style={{ position: "relative" }}>
      <StyledSlider
        className="timeline-slider"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={handleChange}
        renderTrack={renderTrack}
        renderThumb={renderThumb}
        onAfterChange={(v) => setShowTooltip(false)}
      />
      {showTooltip && (
        <YearTooltip style={{ left: `${tooltipPosition}px` }}>
          {tooltipValue}
        </YearTooltip>
      )}
    </div>
  );
};

const Timeline: React.FC<TimelineProps> = ({ 
  periods, 
  currentYear, 
  onYearChange,
  currentPhotoIndex = 0,
  totalPhotos = 0
}) => {
  // Get min and max years from periods
  const years = periods.map(period => period.year).sort((a, b) => a - b);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  
  // Keep track of the continuous year value (floating point)
  const [continuousYear, setContinuousYear] = useState<number>(currentYear);
  const [displayedYear, setDisplayedYear] = useState<string>(`${currentYear}`);
  
  // Track the last time a user interacted with the slider
  const lastInteractionTime = useRef<number>(0);
  const lastYearFromProps = useRef<number>(currentYear);
  
  // Update continuousYear when currentYear changes from external sources
  useEffect(() => {
    // Skip if no change in year
    if (currentYear === lastYearFromProps.current) return;
    
    // Only update the slider if it's been >500ms since user interaction
    // This prevents fighting between keyboard navigation and slider
    const now = Date.now();
    if (now - lastInteractionTime.current > 500) {
      setContinuousYear(currentYear);
      setDisplayedYear(formatYearValue(currentYear));
    }
    
    lastYearFromProps.current = currentYear;
  }, [currentYear]);
  
  // Function to convert from slider value to display format
  const formatYearValue = (value: number): string => {
    const year = Math.floor(value);
    const fraction = value - year;
    if (fraction === 0) return `${year}`;
    
    // Convert fraction to month
    const month = Math.round(fraction * 12);
    // Handle edge case where month is 0 or outside valid range
    const safeMonth = Math.min(Math.max(month, 1), 12);
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${year} ${monthNames[safeMonth - 1]}`;
  };
  
  // Handle slider drag/change
  const handleSliderDrag = (value: number) => {
    // Record that user is interacting with the slider
    lastInteractionTime.current = Date.now();
    setContinuousYear(value);
    setDisplayedYear(formatYearValue(value));
  };
  
  // Final change handler (when user releases slider)
  const handleSliderChange = (value: number) => {
    // Record that user just interacted with the slider
    lastInteractionTime.current = Date.now();
    // Pass the exact value for precise navigation
    onYearChange(value);
  };

  // Handle click on year marker
  const handleYearClick = (year: number) => {
    // Record that user just interacted with the slider
    lastInteractionTime.current = Date.now();
    setContinuousYear(year);
    onYearChange(year);
  };

  // Generate tick marks for each year
  const renderTicks = () => {
    // Only show tick marks for years that actually exist
    return years.map(year => {
      const position = ((year - minYear) / (maxYear - minYear)) * 100;
      return (
        <TickMark 
          key={year}
          style={{ left: `${position}%` }}
        />
      );
    });
  };

  // Year labels (show every other year if there are many)
  const displayYears = years.length > 10 
    ? years.filter((_, index) => index % 2 === 0)
    : years;

  return (
    <div style={{ 
      padding: "0 20px", 
      position: "relative", 
      height: "100px",
      marginBottom: "20px"
    }}>
      <TimelineSlider
        min={minYear}
        max={maxYear}
        step={0.01}
        value={continuousYear}
        onChange={handleSliderDrag}
        onSliderChange={handleSliderChange}
        displayYear={displayedYear}
        years={years}
      />
      
      <div style={{ position: "relative", height: "30px" }}>
        {renderTicks()}
        
        {/* Year markers below the timeline */}
        {displayYears.map(year => {
          // Calculate position as percentage
          const position = ((year - minYear) / (maxYear - minYear)) * 100;
          
          return (
            <YearMarker 
              key={year}
              style={{ left: `${position}%` }}
              $active={Math.floor(continuousYear) === year}
              onClick={() => handleYearClick(year)}
            >
              {year}
            </YearMarker>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline; 