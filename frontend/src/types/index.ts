export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
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
  year: number;
  month: number;
  timestamp?: string;
  title?: string;
  description?: string;
  tags?: string[];
}

export interface TimelinePeriod {
  year: number;
  count: number;
}

export interface MinioConfig {
  endpoint: string;
  bucket: string;
}

export interface ManifestPhoto {
  id: string;
  path: string;
  blur_hash?: string;
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
  year: number;
  month: number;
  filename: string;
  size?: number;
  timestamp?: string;
  last_modified?: string;
}

export interface Manifest {
  photos: ManifestPhoto[];
  timeline: TimelinePeriod[];
  generated_at: string;
  total_photos: number;
} 