import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/inter/400.css";
import "@fontsource/inter/700.css";
import ExploreGame from "./game/ExploreGame";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ExploreGame />
  </StrictMode>
);
