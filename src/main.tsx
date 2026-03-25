import { createRoot } from "react-dom/client";
import "./i18n";
import App from "./App.tsx";
import "./index.css";
import { APP_VERSION_STORAGE_KEY } from "./config/version";

try {
  const v = localStorage.getItem(APP_VERSION_STORAGE_KEY);
  if (v === "ssl") {
    document.documentElement.dataset.appVersion = "ssl";
  }
} catch {
  /* ignore */
}

createRoot(document.getElementById("root")!).render(<App />);
