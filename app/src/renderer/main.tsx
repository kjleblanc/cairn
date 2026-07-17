import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import { cairn } from "./api";
import type { Preflight, ProjectList } from "../shared/ipc";

function Debug() {
  const [pf, setPf] = useState<Preflight | null>(null);
  const [pl, setPl] = useState<ProjectList | null>(null);
  useEffect(() => {
    cairn.preflight().then(setPf);
    cairn.projectList().then(setPl);
  }, []);
  return <pre>{JSON.stringify({ pf, pl }, null, 2)}</pre>;
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Debug />
  </React.StrictMode>,
);
