// Theme configuration for the Pepper Place application
// Contains centralized styling variables and design tokens

const theme = {
  // Color palette
  colors: {
    primary: "#E27D60",      // Warm terracotta/coral (for slider thumb, year markers)
    secondary: "#41B3A3",    // Teal/aqua accent color
    text: {
      primary: "#333333",    // Dark charcoal (not pure black)
      secondary: "#666666",  // Secondary/lighter text color
      light: "#ffffff",      // Light text (for dark backgrounds)
    },
    background: {
      primary: "#F9F5F0",    // Soft cream/beige main background
      secondary: "#F0EBE3",  // Slightly darker secondary background
      tertiary: "#E8E4DD",   // Tertiary background (for gallery slide wrapper)
    },
    ui: {
      border: "#E0D9CF",     // Softer border color
      shadow: "rgba(0, 0, 0, 0.08)", // Slightly stronger shadow
      overlay: "rgba(63, 50, 42, 0.75)", // Warmer overlay background
    },
    feedback: {
      error: {
        background: "#ffebee", // Light red background for error states
        text: "#c62828",       // Dark red text for error messages
      },
      success: {
        background: "#e8f5e9", // Light green background for success states
        text: "#2e7d32",       // Dark green text for success messages
      },
      warning: {
        background: "#fff8e1", // Light yellow background for warning states
        text: "#f57f17",       // Dark yellow/orange text for warning messages
      },
      info: {
        background: "#e3f2fd", // Light blue background for info states
        text: "#1565c0",       // Dark blue text for info messages
      }
    }
  },
  
  // Spacing scale (in pixels)
  spacing: {
    xs: "4px",
    sm: "8px",
    md: "16px",
    lg: "20px",
    xl: "30px",
    xxl: "40px",
  },
  
  // Typography
  typography: {
    fontFamily: "\"Quicksand\", \"Roboto\", sans-serif",
    fontSize: {
      xs: "0.9rem",
      sm: "1rem",
      md: "1.2rem",
      lg: "1.5rem",
      xl: "2rem",
      xxl: "2.5rem",
    },
    fontWeight: {
      normal: 400,
      medium: 500,
      bold: 700,
    },
    letterSpacing: {
      tight: "-0.5px",
      normal: "0px",
      wide: "1px",
      extraWide: "2px",
    },
  },
  
  // Breakpoints for responsive design
  breakpoints: {
    xs: "320px",
    sm: "576px",
    md: "768px",
    lg: "992px",
    xl: "1200px",
  },
  
  // Border radius
  borderRadius: {
    sm: "4px",
    md: "8px",
    lg: "12px",  // Increased roundness for cards
    xl: "50px", // For completely round elements
  },
  
  // Transitions
  transitions: {
    short: "0.2s ease",
    medium: "0.3s ease",
  },
  
  // Z-index layers
  zIndex: {
    base: 1,
    overlay: 10,
    modal: 20,
    tooltip: 30,
  },
};

export default theme; 