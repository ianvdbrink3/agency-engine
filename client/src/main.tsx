import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Save native fetch before auth interceptor patches it
(window as any).__nativeFetch = window.fetch.bind(window);

if (!window.location.hash) {
  window.location.hash = "#/";
}

createRoot(document.getElementById("root")!).render(<App />);
