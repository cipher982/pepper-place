import React, { useEffect, useRef, useState, useCallback } from "react";
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
  EmptyState,
  ShareButton,
  ShareMenu,
  ShareMenuItem,
  ShareOverlay,
  CopyToast
} from "../styles/PhotoGallery.styles";

// Share configuration - moved outside component for performance
const SITE_URL = "https://pepper.drose.io/";
const SHARE_TEXT = "Check out Pepper's photo journey - 10 years of adventures! 🐾";

type SharePlatform = "twitter" | "facebook" | "pinterest" | "copy";

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
  const shareButtonRef = useRef<HTMLButtonElement>(null);

  // State for share menu and toast
  const [isShareMenuOpen, setIsShareMenuOpen] = useState(false);
  const [showCopyToast, setShowCopyToast] = useState(false);
  
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
    return photos.map((photo, index) => {
      const mediaType = detectMediaType(photo.url);
      const thumbnailUrl = photo.thumbnailUrl || photo.url;
      const isCurrent = index === currentIndex;
      
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
          renderItem: () => (
            <VideoSlide 
              url={photo.url} 
              description={description} 
              blurHash={photo.blurHash} 
            />
          ),
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
            blurHash={photo.blurHash}
            sizes={photo.sizes}
            dimensions={photo.dimensions}
            priority={isCurrent}
          />
        ),
      };
    });
  }, [photos, isImageCached, currentIndex]);
  
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

  // Share functionality with proper accessibility
  const handleShareClick = useCallback(() => {
    setIsShareMenuOpen(prev => !prev);
  }, []);

  const handleCloseShareMenu = useCallback(() => {
    setIsShareMenuOpen(false);
    // Return focus to share button when closing
    shareButtonRef.current?.focus();
  }, []);

  // Handle escape key to close share menu
  useEffect(() => {
    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isShareMenuOpen) {
        handleCloseShareMenu();
      }
    };

    if (isShareMenuOpen) {
      document.addEventListener("keydown", handleEscapeKey);
      return () => document.removeEventListener("keydown", handleEscapeKey);
    }
  }, [isShareMenuOpen, handleCloseShareMenu]);

  const handleShare = useCallback((platform: SharePlatform) => {
    const encodedUrl = encodeURIComponent(SITE_URL);
    const encodedText = encodeURIComponent(SHARE_TEXT);

    let shareUrl = "";

    switch (platform) {
      case "twitter":
        shareUrl = `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
        break;
      case "facebook":
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;
        break;
      case "pinterest": {
        // Get current photo URL for Pinterest (wrapped in block for const declaration)
        const currentPhotoUrl = photos[currentIndex]?.url || "";
        const encodedImageUrl = encodeURIComponent(currentPhotoUrl);
        shareUrl = `https://pinterest.com/pin/create/button/?url=${encodedUrl}&media=${encodedImageUrl}&description=${encodedText}`;
        break;
      }
      case "copy":
        navigator.clipboard.writeText(SITE_URL).then(() => {
          setShowCopyToast(true);
          setTimeout(() => setShowCopyToast(false), 2000);
        }).catch((err) => {
          console.error("Failed to copy link:", err);
        });
        setIsShareMenuOpen(false);
        return;
    }

    if (shareUrl) {
      window.open(shareUrl, "_blank", "noopener,noreferrer,width=600,height=600");
      setIsShareMenuOpen(false);
    }
  }, [photos, currentIndex]);

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

      {/* Share functionality */}
      <ShareOverlay $isOpen={isShareMenuOpen} onClick={handleCloseShareMenu} />

      <ShareMenu id="share-menu" role="menu" $isOpen={isShareMenuOpen} aria-hidden={!isShareMenuOpen}>
        <ShareMenuItem type="button" role="menuitem" onClick={() => handleShare("twitter")}>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
          </svg>
          Share on X
        </ShareMenuItem>

        <ShareMenuItem type="button" role="menuitem" onClick={() => handleShare("facebook")}>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
          </svg>
          Share on Facebook
        </ShareMenuItem>

        <ShareMenuItem type="button" role="menuitem" onClick={() => handleShare("pinterest")}>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path d="M12 0a12 12 0 0 0-4.37 23.17c-.1-.85-.17-2.13 0-3.05l1.24-5.25s-.3-.62-.3-1.53c0-1.43.83-2.5 1.87-2.5.88 0 1.3.66 1.3 1.45 0 .88-.56 2.2-.85 3.42-.24 1.02.51 1.85 1.52 1.85 1.82 0 3.22-1.92 3.22-4.7 0-2.45-1.76-4.17-4.28-4.17-2.92 0-4.63 2.18-4.63 4.44 0 .88.34 1.82.76 2.33.08.1.1.19.07.29l-.28 1.16c-.04.18-.15.22-.34.13-1.28-.59-2.08-2.46-2.08-3.96 0-3.23 2.35-6.2 6.77-6.2 3.55 0 6.32 2.54 6.32 5.92 0 3.53-2.23 6.37-5.32 6.37-1.04 0-2.02-.54-2.35-1.17l-.64 2.44c-.23.9-.85 2.02-1.27 2.71A12 12 0 1 0 12 0z"/>
          </svg>
          Pin on Pinterest
        </ShareMenuItem>

        <ShareMenuItem type="button" role="menuitem" onClick={() => handleShare("copy")}>
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
            <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
          </svg>
          Copy Link
        </ShareMenuItem>
      </ShareMenu>

      <ShareButton
        ref={shareButtonRef}
        $isOpen={isShareMenuOpen}
        onClick={handleShareClick}
        aria-label="Share this gallery"
        aria-expanded={isShareMenuOpen}
        aria-haspopup="menu"
        aria-controls="share-menu"
        type="button"
      >
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
        </svg>
      </ShareButton>

      {/* Toast notification for copy action */}
      <CopyToast $visible={showCopyToast} role="status" aria-live="polite">
        Link copied to clipboard!
      </CopyToast>
    </GalleryContainer>
  );
};

export default PhotoGallery; 