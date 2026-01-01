import React from "react";
import { hydrateRoot, createRoot } from "react-dom/client";
import { ThemeProvider, DefaultTheme } from "styled-components";
import App from "./App";
import theme from "./styles/theme";
import GlobalStyles from "./styles/GlobalStyles";
import reportWebVitals from "./reportWebVitals";

const rootElement = document.getElementById("root") as HTMLElement;

const app = (
  <React.StrictMode>
    <ThemeProvider theme={theme as DefaultTheme}>
      <GlobalStyles />
      <App />
    </ThemeProvider>
  </React.StrictMode>
);

// Use hydrate if pre-rendered by react-snap, otherwise render normally
if (rootElement.hasChildNodes()) {
  hydrateRoot(rootElement, app);
} else {
  createRoot(rootElement).render(app);
}

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();

// Register service worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').then(registration => {
      console.log('SW registered: ', registration);
    }).catch(registrationError => {
      console.log('SW registration failed: ', registrationError);
    });
  });
} 