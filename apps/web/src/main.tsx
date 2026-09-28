import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource/patrick-hand";
import "@fontsource/gaegu/400.css";
import "@fontsource/gaegu/700.css";
import "@fontsource/nunito/400.css";
import "@fontsource/nunito/600.css";
import "@fontsource/nunito/700.css";
import "@fontsource/nunito/800.css";
import "./index.css";
import "./lib/audio";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
