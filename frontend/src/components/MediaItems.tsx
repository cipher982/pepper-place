import React, { useEffect, useState, useCallback, useRef } from "react";
import {
  MediaContainer,
  VideoElement,
  PlayPauseIndicator,
  StyledProgressiveImage
} from "../styles/PhotoGallery.styles";

/**
 * Video player component for use in the photo gallery
 */
export const VideoSlide = ({ url, description }: { url: string; description?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    
    const handleError = (e: Event) => {
      console.error("Video error:", e);
      if (video.error) {
        console.error("Video error code:", video.error.code);
      }
    };
    
    const handleLoaded = () => setIsPlaying(true);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    
    // Add event listeners
    video.addEventListener("error", handleError);
    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);
    
    // Force play when component mounts
    video.play().catch(e => {
      console.error("Error playing video:", e);
      // Retry once after a delay
      setTimeout(() => video.play().catch(e2 => 
        console.error("Retry play failed:", e2)), 1000);
    });
    
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

/**
 * Progressive image component that loads a thumbnail first then the full image
 */
export const ProgressiveImage = ({ 
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