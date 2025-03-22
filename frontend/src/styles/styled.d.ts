import 'styled-components';

// Extend the DefaultTheme interface from styled-components
declare module 'styled-components' {
  export interface DefaultTheme {
    colors: {
      primary: string;
      secondary: string;
      text: {
        primary: string;
        secondary: string;
        light: string;
      };
      background: {
        primary: string;
        secondary: string;
        tertiary: string;
      };
      ui: {
        border: string;
        shadow: string;
        overlay: string;
      };
    };
    
    spacing: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
      xxl: string;
    };
    
    typography: {
      fontFamily: string;
      fontSize: {
        xs: string;
        sm: string;
        md: string;
        lg: string;
        xl: string;
        xxl: string;
      };
      fontWeight: {
        normal: number;
        medium: number;
        bold: number;
      };
    };
    
    breakpoints: {
      xs: string;
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    
    borderRadius: {
      sm: string;
      md: string;
      lg: string;
      xl: string;
    };
    
    transitions: {
      short: string;
      medium: string;
    };
    
    zIndex: {
      base: number;
      overlay: number;
      modal: number;
      tooltip: number;
    };
  }
} 