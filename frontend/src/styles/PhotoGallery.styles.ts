import styled from "styled-components";

export const GalleryContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  margin: 35px auto 0;
  max-width: 1000px;
  width: 100%;
  box-sizing: border-box; /* Important: include padding in width calculation */
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    padding: ${({ theme }) => theme.spacing.md};
    margin: 20px auto 0;
    max-width: 100%; /* Ensure container doesn't exceed screen width */
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: ${({ theme }) => theme.spacing.sm};
    margin: 10px auto 0;
  }
  
  /* Ensure the gallery respects container boundaries */
  .image-gallery {
    background-color: ${({ theme }) => theme.colors.background.secondary};
    border-radius: ${({ theme }) => theme.borderRadius.lg};
    overflow: hidden;
    box-shadow: 0 8px 20px ${({ theme }) => theme.colors.ui.shadow};
    width: 100%; /* Force gallery to respect container width */
    max-width: 100%; /* Never exceed the container */
  }
  
  .image-gallery-content {
    position: relative;
    max-width: 100%; /* Never exceed the container */
  }
  
  .image-gallery-slide-wrapper {
    /* Changed fixed height to responsive values */
    height: 52vh;
    max-height: 550px;
    display: flex;
    align-items: center;
    justify-content: center;
    background-color: ${({ theme }) => theme.colors.background.tertiary};
    width: 100%; /* Ensure full width */
    max-width: 100%; /* Never exceed container width */
    overflow: hidden; /* Prevent overflow */
    
    @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
      height: 45vh;
      max-height: 450px;
    }
    
    @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
      height: 40vh;
      max-height: 350px;
    }
  }
  
  /* Add a style for the react-window list container */
  .react-window-list {
    background-color: ${({ theme }) => theme.colors.background.secondary};
    border-top: 1px solid ${({ theme }) => theme.colors.ui.border};
    margin-top: ${({ theme }) => theme.spacing.md};
    padding: ${({ theme }) => theme.spacing.md} 0;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
      padding: ${({ theme }) => theme.spacing.sm} 0;
      margin-top: ${({ theme }) => theme.spacing.sm};
    }
    
    @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
      padding: ${({ theme }) => theme.spacing.xs} 0;
      margin-top: ${({ theme }) => theme.spacing.xs};
    }
  }
  
  .image-gallery-slide {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    transition: opacity ${({ theme }) => theme.transitions.medium};
    width: 100%; /* Ensure slide takes full width */
    max-width: 100%; /* Make sure slide doesn't exceed container */
    overflow: hidden; /* Prevent overflow */
  }
  
  .image-gallery-slide .image-gallery-image {
    object-fit: contain;
    max-height: 100%;
    max-width: 100%;
    transition: opacity ${({ theme }) => theme.transitions.medium};
    /* Maintaining aspect ratio is important */
    width: auto;
    height: auto;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
      max-width: 100%; /* Make sure image doesn't exceed container on smaller screens */
    }
  }

  .image-gallery-slide video {
    max-height: 100%;
    max-width: 100%;
    object-fit: contain;
    transition: opacity ${({ theme }) => theme.transitions.medium};
    /* Maintaining aspect ratio for videos too */
    width: auto;
    height: auto;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
      max-width: 100%; /* Make sure video doesn't exceed container on smaller screens */
    }
  }
  
  .image-gallery-description {
    background-color: ${({ theme }) => theme.colors.ui.overlay};
    padding: 10px 16px;
    border-radius: ${({ theme }) => theme.borderRadius.md};
    font-size: ${({ theme }) => theme.typography.fontSize.sm};
    letter-spacing: 0.3px;
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    max-width: 80%;
    text-align: center;
    z-index: ${({ theme }) => theme.zIndex.overlay};
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.2);
    
    @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
      font-size: ${({ theme }) => theme.typography.fontSize.xs};
      padding: 8px 12px;
      bottom: 10px;
      max-width: 90%;
    }
  }
  
  .image-gallery-thumbnails-container {
    display: flex;
    overflow-x: auto;
    padding: ${({ theme }) => theme.spacing.md} 0;
    justify-content: center;
    background-color: ${({ theme }) => theme.colors.background.primary};
    border-top: 1px solid ${({ theme }) => theme.colors.ui.border};
    
    /* Make thumbnails container responsive */
    @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
      padding: ${({ theme }) => theme.spacing.sm} 0;
    }
    
    /* Ensure horizontal scrolling works well on mobile */
    @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
      justify-content: flex-start;  /* Start alignment for better scrolling experience */
      padding: ${({ theme }) => theme.spacing.xs} 0;
    }
  }
  
  .image-gallery-thumbnail {
    width: 80px !important; 
    height: auto !important;
    aspect-ratio: 4/3;
    margin: 0 ${({ theme }) => theme.spacing.xs};
    border-radius: ${({ theme }) => theme.borderRadius.md};
    overflow: hidden;
    transition: all ${({ theme }) => theme.transitions.short};
    box-shadow: 0 2px 6px ${({ theme }) => theme.colors.ui.shadow};
    
    &:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 8px ${({ theme }) => theme.colors.ui.shadow};
    }
    
    /* Make thumbnails smaller on mobile */
    @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
      width: 70px !important;
    }
    
    @media (max-width: ${({ theme }) => theme.breakpoints.xs}) {
      width: 60px !important;
    }
  }
  
  .image-gallery-thumbnail.active {
    border: 2px solid ${({ theme }) => theme.colors.primary};
    transform: translateY(-2px) scale(1.05);
  }
  
  .image-gallery-thumbnail-image {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  
  .image-gallery-icon {
    filter: drop-shadow(0px 0px 3px rgba(0, 0, 0, 0.3));
    color: ${({ theme }) => theme.colors.text.light};
    
    &:hover {
      color: ${({ theme }) => theme.colors.primary};
    }
    
    /* Make navigation icons more touch-friendly on mobile */
    @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
      padding: 5px;
    }
  }

  .image-loading {
    opacity: 0.5;
  }
`;

export const PositionIndicator = styled.div`
  position: absolute;
  top: ${({ theme }) => theme.spacing.sm};
  right: ${({ theme }) => theme.spacing.sm};
  background-color: ${({ theme }) => theme.colors.ui.overlay};
  color: ${({ theme }) => theme.colors.text.light};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  z-index: ${({ theme }) => theme.zIndex.overlay};
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    padding: ${({ theme }) => theme.spacing.xs};
    font-size: calc(${({ theme }) => theme.typography.fontSize.xs} - 1px);
  }
`;

export const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: ${({ theme }) => theme.colors.text.secondary};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  box-shadow: 0 4px 12px ${({ theme }) => theme.colors.ui.shadow};
  
  @media (max-width: ${({ theme }) => theme.breakpoints.md}) {
    height: 250px;
  }
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    height: 200px;
    padding: ${({ theme }) => theme.spacing.md};
  }
  
  h3 {
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: ${({ theme }) => theme.typography.fontSize.lg};
    color: ${({ theme }) => theme.colors.text.primary};
    
    @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
      font-size: ${({ theme }) => theme.typography.fontSize.md};
    }
  }
  
  p {
    color: ${({ theme }) => theme.colors.text.secondary};
    
    @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
      font-size: ${({ theme }) => theme.typography.fontSize.sm};
    }
  }
`;

export const MediaContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  max-width: 100%;
  overflow: hidden;
`;

export const VideoElement = styled.video<{ $isPlaying: boolean }>`
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  background-color: ${({ $isPlaying, theme }) => 
    $isPlaying ? "transparent" : "rgba(0,0,0,0.02)"};
  cursor: pointer;
  
  /* Ensure videos are responsive */
  width: auto;
  height: auto;
`;

export const PlayPauseIndicator = styled.div`
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background-color: ${({ theme }) => theme.colors.ui.overlay};
  color: ${({ theme }) => theme.colors.text.light};
  width: 60px;
  height: 60px;
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  display: flex;
  align-items: center;
  justify-content: center;
  
  @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
    width: 50px;
    height: 50px;
  }
  
  svg {
    width: 30px;
    height: 30px;
    
    @media (max-width: ${({ theme }) => theme.breakpoints.sm}) {
      width: 25px;
      height: 25px;
    }
  }
`;

export const StyledProgressiveImage = styled.img<{ $loaded: boolean }>`
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  transition: opacity ${({ theme }) => theme.transitions.medium};
  opacity: ${({ $loaded }) => ($loaded ? "1" : "0.5")};
  
  /* Ensure images are responsive */
  width: auto;
  height: auto;
`; 