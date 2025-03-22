import React from "react";
import ReactSlider from "react-slider";
import styled from "styled-components";
import { TimelinePeriod } from "../types";

interface TimelineProps {
  periods: TimelinePeriod[];
  currentYear: number;
  onYearChange: (year: number) => void;
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
  
  &:focus {
    outline: none;
  }
  
  &:active {
    cursor: grabbing;
  }
`;

const StyledTrack = styled.div<{ $index: number }>`
  top: 10px;
  bottom: 10px;
  background: ${props => props.$index === 1 ? "#ddd" : "#83a4d4"};
  border-radius: 999px;
  position: relative;
`;

const YearMarker = styled.div<{ active: boolean }>`
  position: absolute;
  font-size: 12px;
  color: ${props => props.active ? "#ff6b6b" : "#666"};
  bottom: -25px;
  transform: translateX(-50%);
  font-weight: ${props => props.active ? "bold" : "normal"};
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
  value: number;
  onChange: (value: number) => void;
  yearLabel: number;
}> = ({ min, max, value, onChange, yearLabel }) => {
  const handleChange = (newValue: number | readonly number[]) => {
    onChange(newValue as number);
  };

  const renderThumb = (props: any) => {
    const { key, ...restProps } = props;
    return <StyledThumb key={key} {...restProps}>{yearLabel}</StyledThumb>;
  };

  const renderTrack = (props: any, state: { index: number }) => {
    const { key, ...restProps } = props;
    return <StyledTrack key={key} {...restProps} $index={state.index} />;
  };

  return (
    <StyledSlider
      className="timeline-slider"
      min={min}
      max={max}
      value={value}
      onChange={handleChange}
      renderTrack={renderTrack}
      renderThumb={renderThumb}
    />
  );
};

const Timeline: React.FC<TimelineProps> = ({ periods, currentYear, onYearChange }) => {
  // Get min and max years from periods
  const years = periods.map(period => period.year);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  
  // Calculate current value for slider (index in the years array)
  const currentIndex = years.indexOf(currentYear) !== -1 
    ? years.indexOf(currentYear) 
    : 0;
  
  const handleSliderChange = (value: number) => {
    onYearChange(years[value]);
  };

  return (
    <div style={{ padding: "0 20px", position: "relative", height: "80px" }}>
      <TimelineSlider
        min={0}
        max={years.length - 1}
        value={currentIndex}
        onChange={handleSliderChange}
        yearLabel={currentYear}
      />
      
      {/* Year markers below the timeline */}
      {years.map((year, index) => {
        // Calculate position as percentage
        const position = `${(index / (years.length - 1)) * 100}%`;
        
        return (
          <YearMarker 
            key={year}
            style={{ left: position }}
            active={year === currentYear}
          >
            {year}
          </YearMarker>
        );
      })}
    </div>
  );
};

export default Timeline; 