import React, { useEffect, useState, useCallback, useRef } from "react";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import { Photo } from "../types";
import usePhotoNavigation from "../hooks/usePhotoNavigation";
import useImagePreloader from "../hooks/useImagePreloader";
import {
  GalleryContainer,
  PositionIndicator,
  EmptyState,
  MediaContainer,
  VideoElement,
  PlayPauseIndicator,
  StyledProgressiveImage
} from "../styles/PhotoGallery.styles";

interface PhotoGalleryProps {
  photos: Photo[];
  initialYear?: number;
  onYearChange?: (year: number) => void;
}

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
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleError = (e: Event) => {
      console.error("Video error:", e);
      if (video.error) {
        console.error("Video error code:", video.error.code);
        console.error("Video error message:", video.error.message);
      }
    };
    
    const handleLoaded = () => {
      console.log("Video loaded successfully:", url);
      setIsPlaying(true);
    };
    
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    // Add event listeners
    video.addEventListener("error", handleError);
    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    
    // Force play when component mounts
    const playVideo = async () => {
      try {
        await video.play();
      } catch (e) {
        console.error("Error playing video:", e);
        // Retry once after a delay
        setTimeout(async () => {
          try {
            await video.play();
          } catch (e2) {
            console.error("Retry play failed:", e2);
          }
        }, 1000);
      }
    };
    
    playVideo();
    
    // Clean up event listeners
    return () => {
      if (video) {
        video.pause();
        video.removeEventListener("error", handleError);
        video.removeEventListener("loadeddata", handleLoaded);
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
      }
    };
  }, [url]);

  const togglePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play().catch(e => console.error("Error playing video:", e));
    } else {
      video.pause();
    }
  }, []);

  return (
    <MediaContainer>
      <VideoElement
        ref={videoRef}
        src={url}
        autoPlay
        loop
        muted
        playsInline
        controls={false}
        $isPlaying={isPlaying}
        onClick={togglePlayPause}
        onError={(e) => console.error("Video onError event:", e)}
      />
      {!isPlaying && (
        <PlayPauseIndicator>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="white" width="36px" height="36px">
            <path d="M8 5v14l11-7z" />
          </svg>
        </PlayPauseIndicator>
      )}
    </MediaContainer>
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
  const [loaded, setLoaded] = useState(isImageCached(src));
  const [currentSrc, setCurrentSrc] = useState(loaded ? src : thumbnailSrc);
  
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
    <StyledProgressiveImage
      src={currentSrc}
      alt={alt}
      $loaded={loaded}
    />
  );
};

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
    isImageCached,
    getCachedImage
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
    return photos.map((photo, index) => {
      const mediaType = detectMediaType(photo.url);
      
      const thumbnailUrl = photo.thumbnailUrl || photo.url;
      
      // Create description text
      const description = `${photo.month}/${photo.year}${photo.description ? ` - ${photo.description}` : ''}`;
      
      if (mediaType === 'video') {
        return {
          original: photo.url,
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
  
  // Handle slide changes, but don't trigger circular updates
  const handleSlideChange = (newIndex: number) => {
    // Only report year changes if callback is provided
    if (onYearChange && photos[newIndex] && photos[newIndex].year) {
      onYearChange(photos[newIndex].year);
    }
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
      <ImageGallery
        items={galleryItems}
        showFullscreenButton={true}
        showPlayButton={false}
        showNav={true}
        showThumbnails={true}
        showBullets={false}
        startIndex={currentIndex || 0}
        onSlide={handleSlideChange}
        slideDuration={0}
        slideInterval={3000}
        lazyLoad={true}
        disableKeyDown={true}
      />
      
      <PositionIndicator>
        {position.index + 1} of {position.total}
      </PositionIndicator>
    </GalleryContainer>
  );
};

export default PhotoGallery; 