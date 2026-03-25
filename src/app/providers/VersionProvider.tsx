import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import {
  APP_VERSION_STORAGE_KEY,
  DEFAULT_APP_VERSION,
  isAppVersion,
  type AppVersion,
} from "@/config/version";

function readStoredVersion(): AppVersion {
  try {
    const v = localStorage.getItem(APP_VERSION_STORAGE_KEY);
    if (isAppVersion(v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_APP_VERSION;
}

type VersionContextValue = {
  version: AppVersion;
  setVersion: (v: AppVersion) => void;
};

const VersionContext = createContext<VersionContextValue | null>(null);

export const VersionProvider = ({ children }: PropsWithChildren) => {
  const [version, setVersionState] = useState<AppVersion>(readStoredVersion);

  const setVersion = (v: AppVersion) => {
    setVersionState(v);
    try {
      localStorage.setItem(APP_VERSION_STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    if (version === "ssl") {
      document.documentElement.dataset.appVersion = "ssl";
    } else {
      delete document.documentElement.dataset.appVersion;
    }
  }, [version]);

  return (
    <VersionContext.Provider value={{ version, setVersion }}>
      {children}
    </VersionContext.Provider>
  );
};

export const useVersion = () => {
  const ctx = useContext(VersionContext);
  if (!ctx) throw new Error("useVersion must be used within VersionProvider");
  return ctx;
};
