import React, { useState } from "react";
import { TimelinePeriod } from "../types";
import {
  StyledSlider,
  StyledThumb,
  StyledTrack,
  YearMarker,
  TickMark,
  YearTooltip,
  TimelineContainer,
  NavigationStatsContainer,
  SliderWrapper
} from "../styles/Timeline.styles";

interface TimelineProps {
  periods: TimelinePeriod[];
  currentYear: number;
  onYearChange: (year: number) => void;
  currentPhotoIndex?: number;
  totalPhotos?: number;
}

const Timeline: React.FC<TimelineProps> = ({ 
  periods, 
  currentYear, 
  onYearChange,
  currentPhotoIndex = 0,
  totalPhotos = 0
}) => {
  // Get min and max years from periods
  const years = periods.map(period => period.year).sort((a, b) => a - b);
  const minYear = years.length ? Math.min(...years) : new Date().getFullYear() - 1;
  const maxYear = years.length ? Math.max(...years) : new Date().getFullYear();
  
  // Local state for dragging
  const [isDragging, setIsDragging] = useState(false);
  const [dragValue, setDragValue] = useState<number>(currentYear);
  const [showTooltip, setShowTooltip] = useState(false);
  const [tooltipPosition, setTooltipPosition] = useState(0);
  
  // Format year value for display
  const formatYearValue = (value: number): string => {
    const year = Math.floor(value);
    const fraction = value - year;
    
    if (fraction === 0) return `${year}`;
    
    // Convert fraction to month
    const month = Math.round(fraction * 12);
    const safeMonth = Math.min(Math.max(month, 1), 12);
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];
    return `${year} ${monthNames[safeMonth - 1]}`;
  };
  
  // Handle slider drag
  const handleSliderDrag = (value: number) => {
    setIsDragging(true);
    setDragValue(value);
  };
  
  // Handle final slider change
  const handleSliderChange = (value: number) => {
    setIsDragging(false);
    onYearChange(value);
  };

  // Handle year marker click
  const handleYearClick = (year: number) => {
    onYearChange(year);
  };

  // The display value and text
  const displayValue = isDragging ? dragValue : currentYear;
  const displayYearText = formatYearValue(displayValue);

  // Render components using styled components
  const renderThumb = (props: any) => {
    const { key, ...restProps } = props;
    return (
      <StyledThumb 
        key={key} 
        {...restProps}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onMouseMove={(e) => {
          const rect = e.currentTarget.getBoundingClientRect();
          setTooltipPosition(rect.left + rect.width / 2);
        }}
      >
        {/* Removed year text from inside the thumb */}
      </StyledThumb>
    );
  };

  const renderTrack = (props: any, state: { index: number }) => {
    const { key, ...restProps } = props;
    return <StyledTrack key={key} {...restProps} $index={state.index} />;
  };

  // Handle slider value change with proper type handling
  const handleSliderValueChange = (value: number | readonly number[], index: number) => {
    handleSliderDrag(value as number);
  };

  const handleSliderAfterChange = (value: number | readonly number[], index: number) => {
    handleSliderChange(value as number);
  };

  // Generate tick marks and year markers
  const renderTimelineMarkers = () => {
    // For many years, show fewer markers
    let markersToShow = years;
    if (years.length > 10) {
      const spacing = Math.max(1, Math.ceil(years.length / 8));
      markersToShow = years.filter((_, index) => index % spacing === 0 || index === years.length - 1);
    }
    
    return (
      <>
        {/* Render tick marks for all years */}
        {years.map(year => {
          const position = ((year - minYear) / (maxYear - minYear)) * 100;
          return (
            <TickMark 
              key={`tick-${year}`}
              $position={position}
            />
          );
        })}
        
        {/* Render year labels for selected years */}
        {markersToShow.map(year => {
          const position = ((year - minYear) / (maxYear - minYear)) * 100;
          const isActive = Math.floor(displayValue) === year;
          
          return (
            <YearMarker 
              key={`year-${year}`}
              $position={position}
              $active={isActive}
              onClick={() => handleYearClick(year)}
            >
              {year}
            </YearMarker>
          );
        })}
      </>
    );
  };

  return (
    <TimelineContainer>
      <SliderWrapper>
        <StyledSlider
          min={minYear}
          max={maxYear}
          step={1/12} // Step by months
          value={displayValue}
          onChange={handleSliderValueChange}
          onAfterChange={handleSliderAfterChange}
          renderTrack={renderTrack}
          renderThumb={renderThumb}
        />
        {showTooltip && (
          <YearTooltip $position={tooltipPosition}>
            {displayYearText}
          </YearTooltip>
        )}
      </SliderWrapper>
      
      <NavigationStatsContainer>
        {renderTimelineMarkers()}
      </NavigationStatsContainer>
    </TimelineContainer>
  );
};

export default Timeline; 