import { Bell, Headphones, Globe } from "lucide-react";
import { useTranslation } from "react-i18next";

export const TopBar = () => {
  const { t } = useTranslation();

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">
          99
        </div>
        <span className="text-lg font-semibold text-foreground">{t("appName")}</span>
      </div>
      <div className="flex items-center gap-4">
        <button className="hidden rounded-full p-2 hover:bg-secondary">
          <Headphones className="h-5 w-5 text-muted-foreground" />
        </button>
        <button className="hidden rounded-full p-2 hover:bg-secondary">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </button>
        <button
          className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-muted-foreground cursor-default transition-colors"
          aria-label="语言"
          type="button"
          disabled
        >
          <Globe className="h-4 w-4" />
          <span>🇨🇳 中文</span>
        </button>
      </div>
    </header>
  );
};
