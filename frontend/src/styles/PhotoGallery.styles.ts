import styled from "styled-components";

export const GalleryContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.lg};
  margin: 35px auto 0;
  max-width: 1000px;
  
  .image-gallery {
    background-color: ${({ theme }) => theme.colors.background.secondary};
    border-radius: ${({ theme }) => theme.borderRadius.lg};
    overflow: hidden;
    box-shadow: 0 4px 12px ${({ theme }) => theme.colors.ui.shadow};
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
    background-color: ${({ theme }) => theme.colors.background.tertiary};
  }
  
  .image-gallery-slide {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    transition: opacity ${({ theme }) => theme.transitions.medium};
  }
  
  .image-gallery-slide .image-gallery-image {
    object-fit: contain;
    max-height: 100%;
    max-width: 100%;
    transition: opacity ${({ theme }) => theme.transitions.medium};
  }

  .image-gallery-slide video {
    max-height: 100%;
    max-width: 100%;
    object-fit: contain;
    transition: opacity ${({ theme }) => theme.transitions.medium};
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
  }
  
  .image-gallery-thumbnails-container {
    display: flex;
    overflow-x: auto;
    padding: ${({ theme }) => theme.spacing.sm} 0;
    justify-content: center;
    background-color: ${({ theme }) => theme.colors.background.primary};
  }
  
  .image-gallery-thumbnail {
    width: 80px !important;
    height: 60px !important;
    margin: 0 ${({ theme }) => theme.spacing.xs};
    border-radius: ${({ theme }) => theme.borderRadius.md};
    overflow: hidden;
    transition: all ${({ theme }) => theme.transitions.short};
  }
  
  .image-gallery-thumbnail.active {
    border: 2px solid ${({ theme }) => theme.colors.primary};
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
  
  h3 {
    margin-bottom: ${({ theme }) => theme.spacing.sm};
    font-size: ${({ theme }) => theme.typography.fontSize.lg};
    color: ${({ theme }) => theme.colors.text.primary};
  }
  
  p {
    color: ${({ theme }) => theme.colors.text.secondary};
  }
`;

export const MediaContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
`;

export const VideoElement = styled.video<{ $isPlaying: boolean }>`
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  background-color: ${({ $isPlaying, theme }) => 
    $isPlaying ? "transparent" : "rgba(0,0,0,0.02)"};
  cursor: pointer;
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
  
  svg {
    width: 30px;
    height: 30px;
  }
`;

export const StyledProgressiveImage = styled.img<{ $loaded: boolean }>`
  max-height: 100%;
  max-width: 100%;
  object-fit: contain;
  transition: opacity ${({ theme }) => theme.transitions.medium};
  opacity: ${({ $loaded }) => ($loaded ? "1" : "0.5")};
`; 