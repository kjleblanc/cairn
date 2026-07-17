import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
import "./tokens.css";
import "./app.css";
import React from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";

const savedTheme = localStorage.getItem("cairn-theme");
if (savedTheme === "light" || savedTheme === "dark") document.documentElement.dataset.theme = savedTheme;

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
