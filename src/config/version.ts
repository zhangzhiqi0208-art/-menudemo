/** 业务版本：BR（巴西）与 SSL（简化套餐新建表单 + 橙色主题） */
export type AppVersion = "br" | "ssl";

export const APP_VERSION_STORAGE_KEY = "appMarketVersion";

export const DEFAULT_APP_VERSION: AppVersion = "br";

export function isAppVersion(v: string | null | undefined): v is AppVersion {
  return v === "br" || v === "ssl";
}
