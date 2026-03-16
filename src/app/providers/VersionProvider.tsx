import {
  createContext,
  useContext,
  useState,
  type PropsWithChildren,
} from "react";
import { AppVersion, VERSION_CONFIG } from "@/config/version";

type VersionContextValue = {
  version: AppVersion;
  setVersion: (v: AppVersion) => void;
  features: (typeof VERSION_CONFIG)[AppVersion]["features"];
};

const VersionContext = createContext<VersionContextValue | null>(null);

export const VersionProvider = ({ children }: PropsWithChildren) => {
  // 先默认使用 v1，后续可接入接口 / localStorage
  const [version, setVersion] = useState<AppVersion>("v1");
  const features = VERSION_CONFIG[version].features;

  return (
    <VersionContext.Provider value={{ version, setVersion, features }}>
      {children}
    </VersionContext.Provider>
  );
};

export const useVersion = () => {
  const ctx = useContext(VersionContext);
  if (!ctx) throw new Error("useVersion must be used within VersionProvider");
  return ctx;
};

export const useFeatureFlag = <
  K extends keyof VersionContextValue["features"],
>(
  key: K,
) => {
  const { features } = useVersion();
  return features[key];
};

