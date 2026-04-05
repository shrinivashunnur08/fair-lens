import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: "#0c0c1e",
              color: "#f1f5f9",
              border: "1px solid #1e1e3f",
              fontFamily: "Manrope, sans-serif",
              fontSize: "14px",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#0c0c1e" },
            },
            error: { iconTheme: { primary: "#ef4444", secondary: "#0c0c1e" } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
