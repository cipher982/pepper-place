import styled from "styled-components";
import ReactSlider from "react-slider";

export const TimelineContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.sm} ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.md};
  position: relative;
  margin-top: ${({ theme }) => theme.spacing.md};
  border-radius: ${({ theme }) => theme.borderRadius.lg};
  background-color: ${({ theme }) => theme.colors.background.secondary};
  box-shadow: 0 3px 10px ${({ theme }) => theme.colors.ui.shadow};
`;

export const StyledThumb = styled.div`
  height: 30px;
  width: 30px;
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  cursor: grab;
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.light};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  top: -8px;
  position: relative;
  box-shadow: 0 3px 8px rgba(226, 125, 96, 0.4);
  transition: transform ${({ theme }) => theme.transitions.short};
  
  &:focus {
    outline: none;
  }
  
  &:active {
    cursor: grabbing;
    transform: scale(1.1);
  }
`;

export const StyledTrack = styled.div<{ $index: number }>`
  top: 8px;
  bottom: 8px;
  background: ${({ $index, theme }) => $index === 1 ? theme.colors.ui.border : theme.colors.secondary};
  border-radius: 999px;
  position: relative;
  height: 4px;
`;

export const YearMarker = styled.div<{ $active: boolean; $position: number }>`
  position: absolute;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.text.secondary};
  bottom: -18px;
  left: ${({ $position }) => `${$position}%`};
  transform: translateX(-50%);
  font-weight: ${({ $active, theme }) => $active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.normal};
  z-index: ${({ theme }) => theme.zIndex.base};
  background-color: ${({ theme }) => theme.colors.background.primary};
  padding: ${({ theme }) => theme.spacing.xs} ${({ theme }) => theme.spacing.sm};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.short};
  box-shadow: ${({ $active, theme }) => $active ? `0 2px 5px ${theme.colors.ui.shadow}` : 'none'};
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    transform: translateX(-50%) scale(1.1);
    box-shadow: 0 2px 5px ${({ theme }) => theme.colors.ui.shadow};
  }
`;

export const TickMark = styled.div<{ $position: number }>`
  position: absolute;
  width: 2px;
  height: 6px;
  background-color: ${({ theme }) => theme.colors.ui.border};
  bottom: -3px;
  left: ${({ $position }) => `${$position}%`};
  transform: translateX(-50%);
`;

export const YearTooltip = styled.div<{ $position: number }>`
  position: absolute;
  background-color: ${({ theme }) => theme.colors.ui.overlay};
  color: ${({ theme }) => theme.colors.text.light};
  padding: 4px 8px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  bottom: 40px;
  left: ${({ $position }) => `${$position}px`};
  transform: translateX(-50%);
  z-index: ${({ theme }) => theme.zIndex.tooltip};
  pointer-events: none;
  white-space: nowrap;
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15);
`;

export const StyledSlider = styled(ReactSlider)`
  width: 100%;
  height: 30px;
  margin-top: ${({ theme }) => theme.spacing.sm};
`;

export const SliderWrapper = styled.div`
  position: relative;
`;

export const NavigationStatsContainer = styled.div`
  position: relative;
  margin-top: ${({ theme }) => theme.spacing.xs};
  height: 20px;
`;

export const PositionText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
`; 