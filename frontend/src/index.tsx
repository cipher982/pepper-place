import React from "react";
import ReactDOM from "react-dom/client";
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