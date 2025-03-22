import styled from "styled-components";

export const AppContainer = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily};
  max-width: 1200px;
  margin: 0 auto;
  padding: ${({ theme }) => theme.spacing.lg};
`;

export const Header = styled.header`
  text-align: center;
  margin-bottom: ${({ theme }) => theme.spacing.xl};
  
  h1 {
    font-size: ${({ theme }) => theme.typography.fontSize.xxl};
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: ${({ theme }) => theme.spacing.xs};
    letter-spacing: ${({ theme }) => theme.typography.letterSpacing.wide};
    font-weight: ${({ theme }) => theme.typography.fontWeight.bold};
    position: relative;
    display: inline-block;
    
    &:after {
      content: '';
      display: block;
      width: 40%;
      height: 3px;
      background-color: ${({ theme }) => theme.colors.primary};
      margin: 8px auto 0;
      border-radius: 2px;
    }
  }
  
  p {
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    color: ${({ theme }) => theme.colors.text.secondary};
    letter-spacing: ${({ theme }) => theme.typography.letterSpacing.normal};
    font-weight: ${({ theme }) => theme.typography.fontWeight.normal};
  }
`;

export const Footer = styled.footer`
  text-align: center;
  margin-top: ${({ theme }) => theme.spacing.xxl};
  padding: ${({ theme }) => theme.spacing.lg};
  color: ${({ theme }) => theme.colors.text.secondary};
  font-size: ${({ theme }) => theme.typography.fontSize.xs};
`;

export const LoadingState = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  height: 300px;
  font-size: ${({ theme }) => theme.typography.fontSize.md};
  color: ${({ theme }) => theme.colors.text.secondary};
`;

export const ErrorState = styled.div`
  background-color: ${({ theme }) => theme.colors.feedback.error.background};
  padding: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin: ${({ theme }) => theme.spacing.lg} 0;
  color: ${({ theme }) => theme.colors.feedback.error.text};
`;

export const TimelineGalleryContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
`; 