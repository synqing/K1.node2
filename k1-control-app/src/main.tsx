
  import { createRoot } from "react-dom/client";
  import App from "./App.tsx";
  import "./styles/design-tokens-v2.css"; // K1 Design System v2.0 tokens
  import "./index.css";

  createRoot(document.getElementById("root")!).render(<App />);
  