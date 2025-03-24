import React, { useEffect, useRef } from "react";
// @ts-ignore - Ignoring the type error with ImageGallery import
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { Photo } from "../types";
import useImagePreloader from "../hooks/useImagePreloader";
import { detectMediaType } from "../utils/media";
import { VideoSlide, ProgressiveImage } from "./MediaItems";
import ThumbnailBar from "./ThumbnailBar";
import {
  GalleryContainer,
  PositionIndicator,
  EmptyState
} from "../styles/PhotoGallery.styles";

interface PhotoGalleryProps {
  photos: Photo[];
  initialYear?: number;
  onYearChange?: (year: number) => void;
  navigationSource?: "timeline" | "keyboard" | null;
  currentIndex: number;
  setCurrentIndex: (index: number) => void;
  currentPhoto?: Photo;
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ 
  photos, 
  initialYear, 
  onYearChange,
  navigationSource,
  currentIndex,
  setCurrentIndex,
  currentPhoto
}) => {
  // Reference to the gallery element
  const galleryRef = useRef<HTMLDivElement>(null);
  
  // Preload images for smoother navigation
  const {
    isImageCached
  } = useImagePreloader({
    photos,
    currentIndex,
    navigationDirection: null
  });
  
  // React to external year change (from Timeline) - only if initialYear is provided
  // and not during keyboard navigation
  useEffect(() => {
    if (initialYear && currentPhoto && navigationSource === "timeline") {
      // Extract year and month from the initialYear (which can be a decimal)
      const targetYear = Math.floor(initialYear);
      const targetMonth = Math.round((initialYear - targetYear) * 12) || 1;
      
      // Calculate the decimal year value of current photo
      const currentPhotoYearValue = currentPhoto.year + (currentPhoto.month - 1) / 12;
      
      // Only update if there's a significant difference (more than ~2 weeks)
      if (Math.abs(initialYear - currentPhotoYearValue) > 0.04) {
        // First try to find a photo with both matching year and closest month
        const yearPhotos = photos.filter(photo => photo.year === targetYear);
        
        if (yearPhotos.length > 0) {
          // Find the photo with the closest month
          const closestPhoto = yearPhotos.reduce((closest, photo) => {
            const currentDiff = Math.abs(photo.month - targetMonth);
            const closestDiff = Math.abs(closest.month - targetMonth);
            return currentDiff < closestDiff ? photo : closest;
          });
          
          const photoIndex = photos.findIndex(p => p.id === closestPhoto.id);
          if (photoIndex !== -1) {
            setCurrentIndex(photoIndex);
          }
        } else {
          // If no photos in that year, find closest year
          const photoIndex = photos.findIndex(photo => photo.year === targetYear);
          if (photoIndex !== -1) {
            setCurrentIndex(photoIndex);
          }
        }
      }
    }
  }, [initialYear, currentPhoto, photos, setCurrentIndex, navigationSource]);
  
  // Ensure the gallery maintains focus after timeline navigation
  useEffect(() => {
    if (navigationSource === "timeline" && galleryRef.current) {
      // Use a slight delay to ensure the focus occurs after the timeline interaction completes
      setTimeout(() => {
        if (galleryRef.current) {
          galleryRef.current.focus();
        }
      }, 100);
    }
  }, [navigationSource, currentIndex]);
  
  // Generate gallery items from photos
  const galleryItems = React.useMemo(() => {
    return photos.map((photo) => {
      const mediaType = detectMediaType(photo.url);
      const thumbnailUrl = photo.thumbnailUrl || photo.url;
      
      // Create description text
      const description = `${photo.month}/${photo.year}${photo.description ? ` - ${photo.description}` : ''}`;
      
      if (mediaType === 'video') {
        return {
          original: photo.url,
          // We're still including the thumbnail property as it's needed for the react-image-gallery items structure
          // but we're disabling the thumbnails display, so these won't create network requests
          thumbnail: thumbnailUrl,
          thumbnailHeight: 60,
          thumbnailWidth: 80,
          description,
          renderItem: () => <VideoSlide url={photo.url} description={description} />,
        };
      }
      
      return {
        original: photo.url,
        thumbnail: thumbnailUrl,
        thumbnailHeight: 60,
        thumbnailWidth: 80,
        description,
        originalAlt: description,
        thumbnailAlt: `Thumbnail - ${description}`,
        renderItem: () => (
          <ProgressiveImage
            src={photo.url}
            thumbnailSrc={thumbnailUrl}
            alt={description}
            isImageCached={isImageCached}
          />
        ),
      };
    });
  }, [photos, isImageCached]);
  
  // Handle slide changes
  const handleSlideChange = (newIndex: number) => {
    // Only report year changes if callback is provided
    if (onYearChange && photos[newIndex]) {
      const photo = photos[newIndex];
      // Convert year and month to a decimal value (e.g. 2020.5 for June 2020)
      const yearWithMonth = photo.year + (photo.month - 1) / 12;
      onYearChange(yearWithMonth);
    }
    
    // Update current index
    setCurrentIndex(newIndex);
  };
  
  // Handle thumbnail click
  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };
  
  // Get the position for the indicator
  const position = {
    index: currentIndex,
    total: photos.length
  };
  
  // If there are no photos, show an empty state
  if (photos.length === 0) {
    return (
      <EmptyState>
        <h3>No Photos Available</h3>
        <p>There are no photos to display at this time.</p>
      </EmptyState>
    );
  }
  
  return (
    <GalleryContainer ref={galleryRef} tabIndex={-1}>
      {/* @ts-ignore - Bypassing type checking for ImageGallery component */}
      <ImageGallery
        items={galleryItems}
        showFullscreenButton={true}
        showPlayButton={false}
        showNav={true}
        showThumbnails={false} // Disable built-in thumbnails
        showBullets={false}
        startIndex={currentIndex || 0}
        onSlide={handleSlideChange}
        slideDuration={0}
        slideInterval={3000}
        lazyLoad={true}
        disableKeyDown={false} // Enable component's built-in keyboard handling
      />
      
      {/* Add our custom virtualized ThumbnailBar */}
      <ThumbnailBar
        photos={photos}
        currentIndex={currentIndex}
        onSelect={handleThumbnailClick}
        itemSize={80}
      />
      
      <PositionIndicator>
        {position.index + 1} of {position.total}
      </PositionIndicator>
    </GalleryContainer>
  );
};

export default PhotoGallery; 