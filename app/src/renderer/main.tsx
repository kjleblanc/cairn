import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
// Decision 9, rule 5: type is rounded and heavy, never thin. Quicksand ships
// 300–700; asking for the mockup's 750–850 would get synthesized faux bold, so
// the heaviest real face is the one we load and the one we use.
import "@fontsource/quicksand/700.css";
import "./tokens.css";
import "./app.css";
// Task 258 (Slice 3): the resident-program foundation. These three define only
// `.rp-`-prefixed selectors, which nothing in the app yet uses, so loading them
// changes no pixel — Slice 4 is what moves the composition onto them. They sit
// after app.css so that when Slice 4 does migrate a surface, the new system
// wins the tie rather than the retired night garden.
import "./surfaces.css";
import "./workspace.css";
import "./cairn-program.css";
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
