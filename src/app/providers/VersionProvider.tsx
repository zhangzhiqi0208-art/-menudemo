import {
  createContext,
  useContext,
  useEffect,
  useState,
  type PropsWithChildren,
} from "react";
import {
  APP_VERSION_STORAGE_KEY,
  defaultListPathForVersion,
  readStoredAppVersion,
  type AppVersion,
} from "@/config/version";

type VersionContextValue = {
  version: AppVersion;
  setVersion: (v: AppVersion) => void;
};

const VersionContext = createContext<VersionContextValue | null>(null);

export const VersionProvider = ({ children }: PropsWithChildren) => {
  const [version] = useState<AppVersion>(readStoredAppVersion);

  const setVersion = (v: AppVersion) => {
    if (v === version) return;
    try {
      localStorage.setItem(APP_VERSION_STORAGE_KEY, v);
    } catch {
      /* ignore */
    }
    /** 整页刷新：丢弃菜单等内存态，不落历史栈（replace），避免跨版本沿用操作结果 */
    window.location.replace(
      new URL(defaultListPathForVersion(v), window.location.origin).href,
    );
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
