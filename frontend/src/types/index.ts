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

export interface S3Config {
  endpoint: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  region?: string;
} 