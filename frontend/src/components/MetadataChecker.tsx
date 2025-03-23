import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { Photo } from "../types";

interface MetadataCheckerProps {
  photos: Photo[];
}

const CheckerContainer = styled.div`
  position: fixed;
  bottom: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.8);
  color: #00ff00;
  padding: 15px;
  border-radius: 5px;
  max-width: 800px;
  max-height: 400px;
  overflow: auto;
  font-family: monospace;
  font-size: 12px;
  z-index: 1000;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
`;

const ToggleButton = styled.button`
  position: fixed;
  bottom: 10px;
  left: 10px;
  background-color: rgba(0, 0, 0, 0.8);
  color: #00ff00;
  border: 1px solid #00ff00;
  border-radius: 5px;
  padding: 5px 10px;
  cursor: pointer;
  z-index: 1001;
  
  &:hover {
    background-color: rgba(0, 0, 0, 0.9);
  }
`;

const Title = styled.h3`
  margin: 0 0 10px 0;
  font-size: 14px;
  color: #00ff00;
  text-align: center;
`;

const Table = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-top: 10px;
`;

const TableRow = styled.tr<{ isInconsistent: boolean }>`
  &:nth-child(odd) {
    background-color: rgba(0, 0, 0, 0.3);
  }
  ${({ isInconsistent }) => isInconsistent && `
    background-color: rgba(255, 0, 0, 0.3) !important;
  `}
`;

const TableHeader = styled.th`
  text-align: left;
  padding: 6px;
  border-bottom: 1px solid #444;
`;

const TableCell = styled.td`
  padding: 6px;
  border-bottom: 1px solid #333;
`;

// Photo with metadata information
interface PhotoMetadata {
  id: string;
  pathYear: number | null;
  pathMonth: number | null;
  metadataYear: number;
  metadataMonth: number;
  url: string;
  isInconsistent: boolean;
}

const MetadataChecker: React.FC<MetadataCheckerProps> = ({ photos }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [photosMetadata, setPhotosMetadata] = useState<PhotoMetadata[]>([]);
  const [statistics, setStatistics] = useState({
    total: 0,
    inconsistent: 0,
    percentInconsistent: 0
  });
  
  // Extract year and month from photo path
  const extractDateFromPath = (path: string): { year: number | null; month: number | null } => {
    const parts = path.split("/");
    if (parts.length < 4) return { year: null, month: null };
    
    try {
      const pathYear = parseInt(parts[parts.length - 3], 10);
      const pathMonth = parseInt(parts[parts.length - 2], 10);
      
      return {
        year: isNaN(pathYear) ? null : pathYear,
        month: isNaN(pathMonth) ? null : pathMonth
      };
    } catch (e) {
      return { year: null, month: null };
    }
  };
  
  // Analyze photos when they change
  useEffect(() => {
    if (photos.length === 0) return;
    
    const metadata: PhotoMetadata[] = photos.map(photo => {
      const { year: pathYear, month: pathMonth } = extractDateFromPath(photo.url);
      
      const isInconsistent = (
        pathYear !== null && 
        pathMonth !== null && 
        (pathYear !== photo.year || pathMonth !== photo.month)
      );
      
      return {
        id: photo.id.substring(0, 8) + "...",
        pathYear,
        pathMonth,
        metadataYear: photo.year,
        metadataMonth: photo.month,
        url: photo.url,
        isInconsistent
      };
    });
    
    // Sort with inconsistencies first
    metadata.sort((a, b) => {
      if (a.isInconsistent && !b.isInconsistent) return -1;
      if (!a.isInconsistent && b.isInconsistent) return 1;
      return 0;
    });
    
    // Just show first 50 for performance
    setPhotosMetadata(metadata.slice(0, 50));
    
    // Calculate statistics
    const inconsistentCount = metadata.filter(m => m.isInconsistent).length;
    setStatistics({
      total: metadata.length,
      inconsistent: inconsistentCount,
      percentInconsistent: (inconsistentCount / metadata.length) * 100
    });
    
  }, [photos]);
  
  if (!isVisible) {
    return <ToggleButton onClick={() => setIsVisible(true)}>Metadata Check</ToggleButton>;
  }

  return (
    <CheckerContainer>
      <ToggleButton onClick={() => setIsVisible(false)}>Hide</ToggleButton>
      
      <div>
        <Title>Photo Metadata Consistency Check</Title>
        
        <div style={{ marginBottom: "15px" }}>
          <div><strong>Total Photos:</strong> {statistics.total}</div>
          <div><strong>Photos with Inconsistent Metadata:</strong> {statistics.inconsistent}</div>
          <div><strong>Percent Inconsistent:</strong> {statistics.percentInconsistent.toFixed(2)}%</div>
          {statistics.inconsistent > 0 && (
            <div style={{ color: "#ff6666", marginTop: "5px" }}>
              Found inconsistencies between path dates and metadata dates!
            </div>
          )}
        </div>
        
        <Table>
          <thead>
            <tr>
              <TableHeader>ID</TableHeader>
              <TableHeader>Path Year-Month</TableHeader>
              <TableHeader>Metadata Year-Month</TableHeader>
              <TableHeader>Status</TableHeader>
            </tr>
          </thead>
          <tbody>
            {photosMetadata.map((photo, index) => (
              <TableRow key={index} isInconsistent={photo.isInconsistent}>
                <TableCell>{photo.id}</TableCell>
                <TableCell>
                  {photo.pathYear !== null && photo.pathMonth !== null
                    ? `${photo.pathYear}-${photo.pathMonth.toString().padStart(2, "0")}`
                    : "N/A"}
                </TableCell>
                <TableCell>
                  {`${photo.metadataYear}-${photo.metadataMonth.toString().padStart(2, "0")}`}
                </TableCell>
                <TableCell>
                  {photo.isInconsistent ? "❌ Mismatch" : "✅ Consistent"}
                </TableCell>
              </TableRow>
            ))}
          </tbody>
        </Table>
      </div>
    </CheckerContainer>
  );
};

export default MetadataChecker; 