import React from "react";
import ReactDOM from "react-dom/client";
import "./css/index.css";        // update path
import App from "./js/App.jsx";   // update path
import { ToastProvider } from "./js/ToastProvider.jsx";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <ToastProvider>
      <App />
    </ToastProvider>
  </React.StrictMode>
);
