/** 业务版本：BR（巴西）与 SSL（简化套餐新建表单 + 橙色主题） */
export type AppVersion = "br" | "ssl";

export const APP_VERSION_STORAGE_KEY = "appMarketVersion";

export const DEFAULT_APP_VERSION: AppVersion = "br";

export function isAppVersion(v: string | null | undefined): v is AppVersion {
  return v === "br" || v === "ssl";
}

/** BR 使用雷亚尔前缀；SSL（墨西哥等）使用 MX$ */
export function pricePrefixForVersion(v: AppVersion): "R$" | "MX$" {
  return v === "ssl" ? "MX$" : "R$";
}

export function readStoredAppVersion(): AppVersion {
  try {
    const raw = localStorage.getItem(APP_VERSION_STORAGE_KEY);
    if (isAppVersion(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_APP_VERSION;
}

/** 切换版本后默认进入的菜单列表路由（若某版本独立列表页，在此区分路径） */
export function defaultListPathForVersion(_version: AppVersion): string {
  return "/";
}
