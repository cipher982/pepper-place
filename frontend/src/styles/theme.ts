// Theme configuration for the Pepper Place application
// Contains centralized styling variables and design tokens

const theme = {
  // Color palette
  colors: {
    primary: "#ff6b6b",      // Primary accent color (currently used for slider thumb, year markers)
    secondary: "#83a4d4",    // Secondary accent (used in slider track)
    text: {
      primary: "#333",       // Primary text color
      secondary: "#666",     // Secondary/lighter text color
      light: "#ffffff",      // Light text (for dark backgrounds)
    },
    background: {
      primary: "#ffffff",    // Main background color
      secondary: "#f8f8f8",  // Secondary background (for cards, containers)
      tertiary: "#f0f0f0",   // Tertiary background (for gallery slide wrapper)
    },
    ui: {
      border: "#ddd",        // Border color
      shadow: "rgba(0, 0, 0, 0.05)", // Shadow color
      overlay: "rgba(0, 0, 0, 0.7)", // Overlay background color
    },
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
    fontFamily: "\"Roboto\", sans-serif",
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
    sm: "3px",
    md: "4px",
    lg: "8px",
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