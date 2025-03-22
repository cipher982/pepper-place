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
  }
  
  p {
    font-size: ${({ theme }) => theme.typography.fontSize.md};
    color: ${({ theme }) => theme.colors.text.secondary};
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
  background-color: #ffebee; /* Consider adding error colors to theme */
  padding: ${({ theme }) => theme.spacing.lg};
  border-radius: ${({ theme }) => theme.borderRadius.md};
  margin: ${({ theme }) => theme.spacing.lg} 0;
  color: #c62828; /* Consider adding error text colors to theme */
`;

export const TimelineGalleryContainer = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  position: relative;
`; 