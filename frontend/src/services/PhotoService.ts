import AWS from "aws-sdk";
import { Photo, S3Config, TimelinePeriod } from "../types";

class PhotoService {
  private s3: AWS.S3;
  private bucket: string;

  constructor(config: S3Config) {
    AWS.config.update({
      accessKeyId: config.accessKeyId,
      secretAccessKey: config.secretAccessKey,
      // Region is not needed for MinIO
    });

    // For MinIO, ensure we have the proper endpoint setup
    this.s3 = new AWS.S3({
      endpoint: config.endpoint,
      s3ForcePathStyle: true, // Needed for MinIO
      signatureVersion: "v4",
      // Ensure SSL is used if endpoint uses https
      sslEnabled: config.endpoint.startsWith("https"),
    });

    this.bucket = config.bucket;
  }

  async listPhotos(): Promise<Photo[]> {
    try {
      // This assumes photos are stored with a structured path like 'photos/YYYY/MM/filename.jpg'
      // or that metadata is stored in the object tags
      const response = await this.s3.listObjectsV2({
        Bucket: this.bucket,
        Prefix: "photos/",
      }).promise();

      if (!response.Contents) {
        return [];
      }

      // Transform S3 objects to Photo objects
      // In a real implementation, you might want to fetch metadata or parse from filenames
      return response.Contents.map((item) => {
        // Example parsing logic - this would need to be adjusted based on your actual file structure
        const key = item.Key || "";
        const parts = key.split("/");
        
        // Very naive parsing - assumes format like photos/2022/05/image.jpg
        const year = parts.length > 1 ? parseInt(parts[1], 10) : new Date().getFullYear();
        const month = parts.length > 2 ? parseInt(parts[2], 10) : 1;
        
        return {
          id: item.Key || "",
          url: this.getPhotoUrl(item.Key || ""),
          thumbnailUrl: this.getPhotoUrl(item.Key || "", true),
          year,
          month,
          tags: []
        };
      }).filter(photo => !isNaN(photo.year)); // Filter out any photos where year parsing failed
    } catch (error) {
      console.error("Error fetching photos:", error);
      // Throw error to be handled by the hook
      throw new Error(`Failed to fetch photos from S3: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  // Get time periods (years) for the timeline
  async getTimeline(): Promise<TimelinePeriod[]> {
    const photos = await this.listPhotos();
    
    // Group photos by year and count them
    const yearCounts = photos.reduce((acc: Record<number, number>, photo) => {
      acc[photo.year] = (acc[photo.year] || 0) + 1;
      return acc;
    }, {});
    
    // Convert to array of TimelinePeriod objects
    return Object.entries(yearCounts).map(([year, count]) => ({
      year: parseInt(year, 10),
      count: count as number
    })).sort((a, b) => a.year - b.year);
  }

  // Get URL for a photo (presigned URL with expiration)
  getPhotoUrl(key: string, thumbnail = false): string {
    try {
      // Adjust key for thumbnail if needed
      const objectKey = thumbnail ? `thumbnails/${key.replace("photos/", "")}` : key;
      
      // Generate a presigned URL that's valid for 1 hour
      const url = this.s3.getSignedUrl("getObject", {
        Bucket: this.bucket,
        Key: objectKey,
        Expires: 3600
      });
      
      return url;
    } catch (error) {
      console.error("Error generating signed URL:", error);
      // Return a placeholder if URL generation fails
      return thumbnail ? "/placeholder-thumbnail.jpg" : "/placeholder.jpg";
    }
  }
}

export default PhotoService; 