import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./client/App";
import "./client/styles.css";
import "./client/ui-system.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("No se encontró el contenedor raíz de la aplicación.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
