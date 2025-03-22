import React from "react";
import ImageGallery from "react-image-gallery";
import "react-image-gallery/styles/css/image-gallery.css";
import styled from "styled-components";
import { Photo } from "../types";

interface PhotoGalleryProps {
  photos: Photo[];
  year: number;
}

const GalleryContainer = styled.div`
  padding: 20px;
  
  .image-gallery-slide .image-gallery-image {
    object-fit: contain;
    max-height: 70vh;
  }
  
  .image-gallery-description {
    background-color: rgba(0, 0, 0, 0.7);
    bottom: 70px;
    color: white;
    padding: 10px;
    border-radius: 4px;
    max-width: 80%;
    margin: 0 auto;
  }
  
  .image-gallery-thumbnails-container {
    display: flex;
    flex-wrap: wrap;
    justify-content: center;
  }
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 300px;
  color: #666;
  
  h3 {
    margin-bottom: 10px;
  }
`;

const PhotoGallery: React.FC<PhotoGalleryProps> = ({ photos, year }) => {
  // Filter photos by the selected year
  const filteredPhotos = photos.filter(photo => photo.year === year);
  
  // Format photos for the ImageGallery component
  const galleryItems = filteredPhotos.map(photo => ({
    original: photo.url,
    thumbnail: photo.thumbnailUrl,
    description: photo.description || `Pepper in ${photo.year}`,
    originalAlt: photo.title || `Pepper - ${photo.year}`,
    thumbnailAlt: photo.title || `Pepper - ${photo.year}`,
  }));

  if (galleryItems.length === 0) {
    return (
      <EmptyState>
        <h3>No photos for {year}</h3>
        <p>Try selecting a different year from the timeline</p>
      </EmptyState>
    );
  }

  return (
    <GalleryContainer>
      <ImageGallery
        items={galleryItems}
        showPlayButton={true}
        showFullscreenButton={true}
        slideInterval={3000}
        thumbnailPosition="bottom"
      />
    </GalleryContainer>
  );
};

export default PhotoGallery; 