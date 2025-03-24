import React, { useEffect } from "react";
// @ts-ignore - Ignoring the type error with ImageGallery import
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { Photo } from "../types";
import usePhotoNavigation from "../hooks/usePhotoNavigation";
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
}

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, initialYear, onYearChange }) => {
  // Get global photo navigation state
  const { 
    currentPhoto, 
    currentIndex,
    setCurrentIndex,
    getPosition 
  } = usePhotoNavigation({ photos });
  
  // Preload images for smoother navigation
  const {
    isImageCached
  } = useImagePreloader({
    photos,
    currentIndex,
    navigationDirection: null
  });
  
  // React to external year change (from Timeline) - only if initialYear is provided
  useEffect(() => {
    if (initialYear && currentPhoto && initialYear !== currentPhoto.year) {
      // Find the first photo of the requested year
      const firstPhotoIndex = photos.findIndex(photo => photo.year === initialYear);
      
      if (firstPhotoIndex !== -1) {
        setCurrentIndex(firstPhotoIndex);
      }
    }
  }, [initialYear, currentPhoto, photos, setCurrentIndex]);
  
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
    if (onYearChange && photos[newIndex] && photos[newIndex].year) {
      onYearChange(photos[newIndex].year);
    }
    
    // Update current index
    setCurrentIndex(newIndex);
  };
  
  // Handle thumbnail click
  const handleThumbnailClick = (index: number) => {
    setCurrentIndex(index);
  };
  
  // Get the position information for the indicator
  const position = getPosition();
  
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
    <GalleryContainer>
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
        disableKeyDown={true}
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