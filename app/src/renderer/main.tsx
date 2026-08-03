import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
// Decision 9, rule 5: type is rounded and heavy, never thin. Quicksand ships
// 300–700; asking for the mockup's 750–850 would get synthesized faux bold, so
// the heaviest real face is the one we load and the one we use.
import "@fontsource/quicksand/700.css";
import "./tokens.css";
import "./app.css";
import "./motion.css";
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
