/**
 * Chat-in-the-scene mockup boot (Task 136). The mock bridge MUST be installed
 * before any renderer module evaluates (`api.ts` reads `window.cairn` at
 * module scope) — ES imports hoist, so the bridge goes in first and the page
 * itself is loaded by dynamic import, exactly like lab/main.tsx.
 */
import "@fontsource/quicksand/400.css";
import "@fontsource/quicksand/600.css";
import "../src/renderer/tokens.css";
import "../src/renderer/app.css";
import "../src/renderer/motion.css";
import "./chatmock.css";

import { installMockCairn } from "./mock-cairn";

installMockCairn();
window.__lab?.setScenario("running");

void import("./chatmock-view");
