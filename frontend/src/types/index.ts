export interface Photo {
  id: string;
  url: string;
  thumbnailUrl: string;
  year: number;
  month: number;
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
  year: number;
  month: number;
  filename: string;
  size?: number;
  last_modified?: string;
}

export interface Manifest {
  photos: ManifestPhoto[];
  timeline: TimelinePeriod[];
  generated_at: string;
  total_photos: number;
} 