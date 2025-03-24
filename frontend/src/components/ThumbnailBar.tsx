import React, { useCallback, useRef, useState, useEffect } from "react";
// @ts-ignore - Ignoring the type error with react-window import
import { FixedSizeList as List } from "react-window";
import styled from "styled-components";
import { Photo } from "../types";

interface ThumbnailBarProps {
  photos: Photo[];
  currentIndex: number;
  onSelect: (index: number) => void;
  itemSize?: number;
}

// Styled container for the thumbnail bar
const StyledThumbnailBar = styled.div`
  width: 100%;
`;

// Styled thumbnail item
const StyledThumbnail = styled.img<{ $isActive: boolean }>`
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  transition: all ${({ theme }) => theme.transitions.short};
  box-shadow: 0 2px 6px ${({ theme }) => theme.colors.ui.shadow};
  border: ${({ $isActive, theme }) => 
    $isActive ? `2px solid ${theme.colors.primary}` : "2px solid transparent"};
  transform: ${({ $isActive }) => 
    $isActive ? "translateY(-2px) scale(1.05)" : "none"};
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 8px ${({ theme }) => theme.colors.ui.shadow};
  }
`;

// ThumbnailItem is a single row/column in our virtualized list
const ThumbnailItem: React.FC<{
  index: number;
  style: React.CSSProperties;
  data: {
    photos: Photo[];
    currentIndex: number;
    onSelect: (index: number) => void;
  };
}> = ({ index, style, data }) => {
  const { photos, currentIndex, onSelect } = data;
  const photo = photos[index];
  
  const handleClick = useCallback(() => {
    onSelect(index);
  }, [index, onSelect]);
  
  const isActive = index === currentIndex;
  
  return (
    <div style={{ 
      ...style, 
      padding: 4, 
      boxSizing: "border-box",
      height: "100%",
      display: "flex",
      alignItems: "center"
    }}>
      <StyledThumbnail
        src={photo.thumbnailUrl}
        alt={`Thumbnail ${index + 1}`}
        onClick={handleClick}
        $isActive={isActive}
        loading="eager"
      />
    </div>
  );
};

const ThumbnailBar: React.FC<ThumbnailBarProps> = ({
  photos,
  currentIndex,
  onSelect,
  itemSize = 80,
}) => {
  // When current index changes, scroll to it
  const listRef = React.useRef<List>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800); // Default fallback width
  
  // Update width when component mounts or window resizes
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.getBoundingClientRect().width);
      }
    };
    
    // Initial calculation
    updateWidth();
    
    // Listen for window resize events
    window.addEventListener("resize", updateWidth);
    
    // Cleanup
    return () => {
      window.removeEventListener("resize", updateWidth);
    };
  }, []);
  
  React.useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollToItem(currentIndex, "center");
    }
  }, [currentIndex]);
  
  return (
    <StyledThumbnailBar ref={containerRef}>
      {containerWidth > 0 && (
        // @ts-ignore - Bypassing type checking for List component
        <List
          ref={listRef}
          className="react-window-list"
          layout="horizontal"
          itemCount={photos.length}
          itemSize={itemSize}
          height={itemSize + 16}
          width={containerWidth}
          itemData={{ photos, currentIndex, onSelect }}
        >
          {ThumbnailItem}
        </List>
      )}
    </StyledThumbnailBar>
  );
};

export default ThumbnailBar; 