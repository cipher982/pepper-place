import React, { useEffect } from "react";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import styled from "styled-components";
import { Photo } from "../types";
import usePhotoNavigation from "../hooks/usePhotoNavigation";
import useImagePreloader from "../hooks/useImagePreloader";

interface PhotoGalleryProps {
  photos: Photo[];
  initialYear?: number;
  onYearChange?: (year: number) => void;
}

const GalleryContainer = styled.div`
  padding: 20px;
  margin: 35px auto 0;
  max-width: 1000px;
  
  .image-gallery {
    background-color: #f8f8f8;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  }
  
  .image-gallery-content {
    position: relative;
  }
  
  .image-gallery-slide-wrapper {
    /* Fixed height container to prevent jumping */
    height: 52vh;
    max-height: 550px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: #f0f0f0;
  }
  
  .image-gallery-slide {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    transition: opacity 0.3s ease;
  }
  
  .image-gallery-slide .image-gallery-image {
    object-fit: contain;
    max-height: 100%;
    max-width: 100%;
    transition: opacity 0.3s ease;
  }

  .image-gallery-slide video {
    max-height: 100%;
    max-width: 100%;
    object-fit: contain;
    transition: opacity 0.3s ease;
  }
  
  .image-gallery-description {
    background-color: rgba(0, 0, 0, 0.6);
    padding: 10px 16px;
    border-radius: 4px;
    font-size: 14px;
    letter-spacing: 0.3px;
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    max-width: 80%;
    text-align: center;
    z-index: 4;
  }
  
  .image-gallery-thumbnails-container {
    display: flex;
    overflow-x: auto;
    padding: 10px 0;
    justify-content: center;
    background-color: #fff;
  }
  
  .image-gallery-thumbnail {
    width: 80px !important;
    height: 60px !important;
    margin: 0 4px;
    border-radius: 4px;
    overflow: hidden;
    transition: all 0.2s ease;
  }
  
  .image-gallery-thumbnail.active {
    border: 2px solid #ff6b6b;
  }
  
  .image-gallery-thumbnail-image {
    height: 100%;
    object-fit: cover;
  }
  
  .image-gallery-icon {
    filter: drop-shadow(0px 0px 3px rgba(0, 0, 0, 0.3));
  }

  .image-loading {
    opacity: 0.5;
  }
`;

const PositionIndicator = styled.div`
  position: absolute;
  top: 15px;
  right: 15px;
  background-color: rgba(0, 0, 0, 0.7);
  color: white;
  padding: 5px 10px;
  border-radius: 4px;
  font-size: 12px;
  z-index: 10;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #666;
  border-radius: 8px;
  background-color: #f8f8f8;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  
  h3 {
    margin-bottom: 10px;
    font-size: 1.5rem;
    color: #444;
  }
  
  p {
    color: #666;
  }
`;

// Helper function to detect media type
const detectMediaType = (url: string): 'image' | 'video' => {
  const videoExtensions = ['.mp4', '.webm', '.mov', '.avi', '.mkv'];
  const urlLower = url.toLowerCase();
  
  if (videoExtensions.some(ext => urlLower.endsWith(ext))) {
    return 'video';
  }
  
  return 'image';
};

// Custom video renderer component
const VideoSlide = ({ url, description }: { url: string; description?: string }) => {
  const videoRef = React.useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = React.useState(false);
  
  React.useEffect(() => {
    console.log("VideoSlide mounting for URL:", url);
    
    const video = videoRef.current;
    if (video) {
      video.addEventListener("error", (e) => {
        console.error("Video error:", e);
        console.error("Video error code:", video.error?.code);
        console.error("Video error message:", video.error?.message);
      });
      
      video.addEventListener("loadeddata", () => {
        console.log("Video loaded successfully:", url);
        setIsPlaying(true);
      });
      
      video.addEventListener("play", () => {
        setIsPlaying(true);
      });
      
      video.addEventListener("pause", () => {
        setIsPlaying(false);
      });
      
      // Force play when component mounts
      video.play().catch(e => {
        console.error("Error playing video:", e);
        setTimeout(() => {
          video.play().catch(e2 => console.error("Retry play failed:", e2));
        }, 1000);
      });
    }
    
    return () => {
      const video = videoRef.current;
      if (video) {
        video.pause();
        video.removeEventListener("error", () => {});
        video.removeEventListener("loadeddata", () => {});
        video.removeEventListener("play", () => {});
        video.removeEventListener("pause", () => {});
      }
    };
  }, [url]);

  return (
    <div className="media-container" style={{ 
      width: "100%", 
      height: "100%", 
      display: "flex", 
      justifyContent: "center", 
      alignItems: "center",
      position: "relative"
    }}>
      <video
        ref={videoRef}
        src={url}
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        style={{ 
          maxHeight: "100%", 
          maxWidth: "100%", 
          objectFit: "contain",
          backgroundColor: isPlaying ? "transparent" : "rgba(0,0,0,0.02)",
          cursor: "pointer"
        }}
        onClick={() => {
          const video = videoRef.current;
          if (video) {
            if (video.paused) {
              video.play();
            } else {
              video.pause();
            }
          }
        }}
        onError={(e) => console.error("Video onError event:", e)}
      />
      {!isPlaying && (
        <div style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "rgba(0,0,0,0.6)",
          color: "white",
          borderRadius: "50%",
          width: "50px",
          height: "50px",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          cursor: "pointer",
          zIndex: 3
        }} onClick={() => {
          const video = videoRef.current;
          if (video) video.play();
        }}>
          ▶
        </div>
      )}
    </div>
  );
};

// Image component with progressive loading
const ProgressiveImage = ({ 
  src, 
  thumbnailSrc,
  alt,
  isImageCached
}: { 
  src: string;
  thumbnailSrc: string;
  alt: string;
  isImageCached: (url: string) => boolean;
}) => {
  const [loaded, setLoaded] = React.useState(isImageCached(src));
  const [currentSrc, setCurrentSrc] = React.useState(loaded ? src : thumbnailSrc);
  
  useEffect(() => {
    // If the image is already cached, use it directly
    if (isImageCached(src)) {
      setCurrentSrc(src);
      setLoaded(true);
      return;
    }
    
    // Otherwise, start with thumbnail and load the full image
    setCurrentSrc(thumbnailSrc);
    setLoaded(false);
    
    const img = new Image();
    img.onload = () => {
      setCurrentSrc(src);
      setLoaded(true);
    };
    img.src = src;
  }, [src, thumbnailSrc, isImageCached]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={!loaded ? "image-loading" : ""}
      style={{ 
        maxHeight: "100%", 
        maxWidth: "100%", 
        objectFit: "contain",
        transition: "opacity 0.3s ease"
      }}
    />
  );
};

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ 
  photos, 
  initialYear,
  onYearChange
}) => {
  // Initialize the photo navigation
  const {
    currentPhoto,
    currentIndex,
    setCurrentIndex,
    nextPhoto,
    prevPhoto,
    getPosition,
    getNavigationDirection,
    totalPhotos
  } = usePhotoNavigation({ photos });

  // Initialize the image preloader
  const { isImageCached } = useImagePreloader({
    photos,
    currentIndex,
    navigationDirection: getNavigationDirection()
  });

  // Notify parent component when current year changes
  useEffect(() => {
    if (currentPhoto && onYearChange) {
      // Only call onYearChange if the year has actually changed from the initial year
      // This helps prevent circular updates
      if (!initialYear || currentPhoto.year !== initialYear) {
        onYearChange(currentPhoto.year);
      }
    }
  }, [currentPhoto, onYearChange, initialYear]);

  // Handle internal gallery navigation to sync with our global index
  const handleSlideChange = (newIndex: number) => {
    if (newIndex !== currentIndex) {
      setCurrentIndex(newIndex);
    }
  };

  if (photos.length === 0) {
    return (
      <EmptyState>
        <h3>No photos available</h3>
        <p>Please check that photos have been uploaded</p>
      </EmptyState>
    );
  }

  // Position information for the indicator
  const position = getPosition();

  // Format photos for the ImageGallery component
  const galleryItems = photos.map(photo => {
    const mediaType = detectMediaType(photo.url);
    const isVideo = mediaType === 'video';
    
    return {
      original: photo.url,
      thumbnail: photo.thumbnailUrl,
      description: photo.description || `Pepper in ${photo.year}`,
      originalAlt: photo.title || `Pepper - ${photo.year}`,
      thumbnailAlt: photo.title || `Pepper - ${photo.year}`,
      mediaType: mediaType,
      // For videos, add a renderItem function that returns our custom video component
      ...(isVideo && {
        renderItem: () => (
          <VideoSlide 
            url={photo.url} 
            description={photo.description || `Pepper in ${photo.year}`}
          />
        )
      })
    };
  });

  return (
    <GalleryContainer>
      <PositionIndicator>
        {position.year} (Photo {position.index + 1} of {position.total})
      </PositionIndicator>
      
      <ImageGallery
        items={galleryItems}
        showPlayButton={false}
        showFullscreenButton={true}
        slideInterval={3000}
        thumbnailPosition="bottom"
        showNav={true}
        lazyLoad={false} // Disable built-in lazy loading, we're doing our own
        additionalClass="custom-image-gallery"
        useBrowserFullscreen={false}
        startIndex={currentIndex}
        onSlide={handleSlideChange}
        isRTL={false}
        disableKeyDown={true} // Disable the built-in keyboard navigation
        disableSwipe={false}
        renderItem={(item: any) => {
          // If the item has a custom renderItem function, use it (for videos)
          if (item.renderItem && typeof item.renderItem === 'function') {
            return item.renderItem();
          }
          
          // Default rendering for images with progressive loading
          return (
            <div className="media-container" style={{ 
              width: "100%", 
              height: "100%", 
              display: "flex", 
              justifyContent: "center", 
              alignItems: "center"
            }}>
              <ProgressiveImage
                src={item.original}
                thumbnailSrc={item.thumbnail}
                alt={item.originalAlt}
                isImageCached={isImageCached}
              />
            </div>
          );
        }}
        renderCustomControls={() => null}
      />
    </GalleryContainer>
  );
};

export default PhotoGallery; 