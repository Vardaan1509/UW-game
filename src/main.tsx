import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import ExploreGame from "./game/ExploreGame";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ExploreGame />
  </StrictMode>
);
