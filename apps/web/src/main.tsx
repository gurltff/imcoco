import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@fontsource/patrick-hand/latin-400.css";
import "@fontsource/gaegu/latin-400.css";
import "@fontsource/gaegu/latin-700.css";
import "@fontsource/nunito/latin-400.css";
import "@fontsource/nunito/latin-600.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-800.css";
import "./index.css";
import "./lib/audio";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
