import styled from "styled-components";
import ReactSlider from "react-slider";

export const TimelineContainer = styled.div`
  padding: ${({ theme }) => theme.spacing.lg} ${({ theme }) => theme.spacing.xl} ${({ theme }) => theme.spacing.xxl};
  position: relative;
`;

export const StyledThumb = styled.div`
  height: 40px;
  width: 40px;
  background-color: ${({ theme }) => theme.colors.primary};
  border-radius: ${({ theme }) => theme.borderRadius.xl};
  cursor: grab;
  display: flex;
  justify-content: center;
  align-items: center;
  color: ${({ theme }) => theme.colors.text.light};
  font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
  top: -10px;
  position: relative;
  box-shadow: 0 2px 4px ${({ theme }) => theme.colors.ui.shadow};
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
  top: 10px;
  bottom: 10px;
  background: ${({ $index, theme }) => $index === 1 ? theme.colors.ui.border : theme.colors.secondary};
  border-radius: 999px;
  position: relative;
`;

export const YearMarker = styled.div<{ $active: boolean; $position: number }>`
  position: absolute;
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ $active, theme }) => $active ? theme.colors.primary : theme.colors.text.secondary};
  bottom: -25px;
  left: ${({ $position }) => `${$position}%`};
  transform: translateX(-50%);
  font-weight: ${({ $active, theme }) => $active ? theme.typography.fontWeight.bold : theme.typography.fontWeight.normal};
  z-index: ${({ theme }) => theme.zIndex.base};
  background-color: rgba(255, 255, 255, 0.7);
  padding: 2px 5px;
  border-radius: ${({ theme }) => theme.borderRadius.sm};
  cursor: pointer;
  transition: all ${({ theme }) => theme.transitions.short};
  
  &:hover {
    color: ${({ theme }) => theme.colors.primary};
    transform: translateX(-50%) scale(1.1);
  }
`;

export const TickMark = styled.div<{ $position: number }>`
  position: absolute;
  width: 2px;
  height: 8px;
  background-color: #aaa;
  bottom: -4px;
  left: ${({ $position }) => `${$position}%`};
  transform: translateX(-50%);
`;

export const YearTooltip = styled.div<{ $position: number }>`
  position: absolute;
  background-color: ${({ theme }) => theme.colors.ui.overlay};
  color: ${({ theme }) => theme.colors.text.light};
  padding: 6px 10px;
  border-radius: ${({ theme }) => theme.borderRadius.md};
  font-size: ${({ theme }) => theme.typography.fontSize.sm};
  bottom: 50px;
  left: ${({ $position }) => `${$position}px`};
  transform: translateX(-50%);
  z-index: ${({ theme }) => theme.zIndex.tooltip};
  pointer-events: none;
  white-space: nowrap;
`;

export const StyledSlider = styled(ReactSlider)`
  width: 100%;
  height: 40px;
  margin-top: ${({ theme }) => theme.spacing.lg};
`;

export const SliderWrapper = styled.div`
  position: relative;
`;

export const NavigationStatsContainer = styled.div`
  position: relative;
  margin-top: ${({ theme }) => theme.spacing.sm};
  height: 30px;
`;

export const PositionText = styled.div`
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
  color: ${({ theme }) => theme.colors.text.secondary};
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.xs};
`; 