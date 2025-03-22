import { createGlobalStyle } from "styled-components";
import { DefaultTheme } from "styled-components";

const GlobalStyles = createGlobalStyle`
  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: ${({ theme }) => theme.typography.fontFamily};
    background-color: ${({ theme }) => theme.colors.background.primary};
    color: ${({ theme }) => theme.colors.text.primary};
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    line-height: 1.6;
  }

  h1, h2, h3, h4, h5, h6 {
    color: ${({ theme }) => theme.colors.text.primary};
    margin-bottom: ${({ theme }) => theme.spacing.md};
    line-height: 1.3;
  }

  a {
    color: ${({ theme }) => theme.colors.primary};
    text-decoration: none;
    transition: color ${({ theme }) => theme.transitions.short};
    
    &:hover {
      text-decoration: underline;
    }
  }

  button {
    cursor: pointer;
    font-family: ${({ theme }) => theme.typography.fontFamily};
  }

  img {
    max-width: 100%;
    height: auto;
  }

  /* Make the react-image-gallery navigation controls more visible */
  .image-gallery-left-nav, 
  .image-gallery-right-nav {
    filter: drop-shadow(0 0 3px rgba(0, 0, 0, 0.3));
  }
`;

export default GlobalStyles; 