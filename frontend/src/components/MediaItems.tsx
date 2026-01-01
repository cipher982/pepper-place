import React, { useEffect, useState, useCallback, useRef } from "react";
import { Blurhash } from "react-blurhash";
import styled from "styled-components";
import {
  MediaContainer,
  VideoElement,
  PlayPauseIndicator,
  StyledProgressiveImage
} from "../styles/PhotoGallery.styles";

const BlurhashContainer = styled.div<{ $loaded: boolean }>`
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: 1;
  opacity: ${({ $loaded }) => ($loaded ? 0 : 1)};
  transition: opacity 0.5s ease-in-out;
  pointer-events: none;
`;

const ImageWrapper = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
`;

/**
 * Helper function to determine the MIME type based on file extension
 */
const getVideoMimeType = (url: string): string => {
  const urlLower = url.toLowerCase();
  if (urlLower.endsWith(".mp4")) return "video/mp4";
  if (urlLower.endsWith(".webm")) return "video/webm";
  if (urlLower.endsWith(".mov")) return "video/quicktime";
  if (urlLower.endsWith(".avi")) return "video/x-msvideo";
  if (urlLower.endsWith(".mkv")) return "video/x-matroska";
  // Default to mp4 if unknown
  return "video/mp4";
};

/**
 * Video player component for use in the photo gallery
 */
export const VideoSlide = ({ url, description, blurHash }: { url: string; description?: string, blurHash?: string }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [canAutoplay, setCanAutoplay] = useState(true);
  const [isInView, setIsInView] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleError = (e: Event) => {
      console.error("Video error:", e);
      if (video.error) {
        console.error("Video error code:", video.error.code);
        // Provide more detailed error message based on error code
        switch(video.error.code) {
          case 1:
            console.error("Video playback aborted by the user");
            break;
          case 2:
            console.error("Network error while loading video");
            break;
          case 3:
            console.error("Video decoding error - may be corrupted or using unsupported features");
            break;
          case 4:
            console.error(
              "Video format not supported by browser. URL:", url,
              "Format appears to be:", getVideoMimeType(url)
            );
            break;
        }
      }
    };

    const handleLoaded = () => {
      setIsPlaying(video.paused === false);
      setLoaded(true);
    };
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);

    // Add event listeners
    video.addEventListener("error", handleError);
    video.addEventListener("loadeddata", handleLoaded);
    video.addEventListener("play", handlePlay);
    video.addEventListener("pause", handlePause);

    // Check if autoplay is allowed (test once, no retry loop)
    video.play()
      .then(() => {
        setCanAutoplay(true);
        video.pause(); // Pause immediately, will play when in view
      })
      .catch(() => {
        setCanAutoplay(false);
        console.log("Autoplay blocked by browser - user must click play");
      });

    // Set up IntersectionObserver to play only when visible
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          setIsInView(entry.isIntersecting);
        });
      },
      { threshold: 0.5 } // Play when 50% visible
    );

    observer.observe(video);

    // Clean up
    return () => {
      observer.disconnect();
      if (video) {
        video.pause();
        video.removeEventListener("error", handleError);
        video.removeEventListener("loadeddata", handleLoaded);
        video.removeEventListener("play", handlePlay);
        video.removeEventListener("pause", handlePause);
      }
    };
  }, [url]);

  // Handle auto-playback based on visibility and autoplay permission
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isInView && canAutoplay) {
      video.play().catch(() => {
        // Autoplay blocked, do nothing (user can click play button)
      });
    } else if (!isInView) {
      video.pause();
    }
  }, [isInView, canAutoplay]);

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
      <ImageWrapper>
        {blurHash && (
          <BlurhashContainer $loaded={loaded}>
            <Blurhash
              hash={blurHash}
              width="100%"
              height="100%"
              resolutionX={32}
              resolutionY={32}
              punch={1}
            />
          </BlurhashContainer>
        )}
        <VideoElement
          ref={videoRef}
          loop
          muted
          playsInline
          controls={false}
          preload="metadata"
          $isPlaying={isPlaying}
          onClick={togglePlayPause}
        >
          <source src={url} type={getVideoMimeType(url)} />
          {/* Add WebM fallback if the original is MP4 */}
          {url.toLowerCase().endsWith('.mp4') && url.replace('.mp4', '.webm') !== url && (
            <source src={url.replace('.mp4', '.webm')} type="video/webm" />
          )}
          Your browser does not support the video tag.
        </VideoElement>
      </ImageWrapper>
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
 * with support for responsive sizes (srcset) and priority hints.
 */
export const ProgressiveImage = ({
  src,
  thumbnailSrc,
  alt,
  isImageCached,
    blurHash,
    sizes,
    dimensions,
    priority = false
  }: { 
    src: string;
    thumbnailSrc: string;
    alt: string;
    isImageCached: (url: string) => boolean;
    blurHash?: string;
    sizes?: {
      small?: string;
      medium?: string;
      large?: string;
    };
    dimensions?: {
      small?: [number, number];
      medium?: [number, number];
      large?: [number, number];
    };
    priority?: boolean;
  }) => {
    const [loaded, setLoaded] = useState(isImageCached(src));
    
    // Use thumbnail as the initial source if not cached
    const initialSrc = loaded ? src : thumbnailSrc;
  
    // Generate srcset if multiple sizes are available, using actual widths
    const srcSet = sizes ? [
      sizes.small && dimensions?.small && `${sizes.small} ${dimensions.small[0]}w`,
      sizes.medium && dimensions?.medium && `${sizes.medium} ${dimensions.medium[0]}w`,
      sizes.large && dimensions?.large && `${sizes.large} ${dimensions.large[0]}w`
    ].filter(Boolean).join(', ') : undefined;
  
    return (
      <ImageWrapper>
        {blurHash && (
          <BlurhashContainer $loaded={loaded}>
            <Blurhash
              hash={blurHash}
              width="100%"
              height="100%"
              resolutionX={32}
              resolutionY={32}
              punch={1}
            />
          </BlurhashContainer>
        )}
        <StyledProgressiveImage
          src={initialSrc}
          srcSet={srcSet}
          // Container is max 786px. On smaller screens it's 100vw.
          sizes="(max-width: 786px) 100vw, 786px"
          alt={alt}
          $loaded={loaded}
          onLoad={() => setLoaded(true)}
          loading={priority ? "eager" : "lazy"}
          // @ts-ignore - fetchpriority is a relatively new attribute
          fetchpriority={priority ? "high" : "low"}
          decoding="async"
        />
      </ImageWrapper>
    );
  };