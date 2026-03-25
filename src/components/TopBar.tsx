import { Bell, ChevronDown, Globe, Headphones } from "lucide-react";
import { useTranslation } from "react-i18next";
import logo99Food from "@/assets/系统内置/99Food-logo.png";
import logoDiDiFood from "@/assets/系统内置/DiDiFood-logo.png";
import { useVersion } from "@/app/providers/VersionProvider";
import type { AppVersion } from "@/config/version";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function normalizeUiLang(lng: string): "zh" | "en" | "pt" {
  if (lng.startsWith("zh")) return "zh";
  if (lng.startsWith("pt")) return "pt";
  return "en";
}

export const TopBar = () => {
  const { t, i18n } = useTranslation();
  const { version, setVersion } = useVersion();
  const current = normalizeUiLang(i18n.resolvedLanguage || i18n.language);

  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-card px-6">
      <div className="flex items-center gap-2">
        <img
          src={version === "ssl" ? logoDiDiFood : logo99Food}
          alt={version === "ssl" ? "DiDiFood" : ""}
          className="h-8 w-8 shrink-0 rounded-lg object-cover"
          width={32}
          height={32}
        />
        <span className="text-lg font-semibold text-foreground">
          {version === "ssl" ? "DiDiFood" : t("appName")}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <button className="hidden rounded-full p-2 hover:bg-secondary">
          <Headphones className="h-5 w-5 text-muted-foreground" />
        </button>
        <button className="hidden rounded-full p-2 hover:bg-secondary">
          <Bell className="h-5 w-5 text-muted-foreground" />
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              aria-label={t("language.menuAria")}
            >
              <Globe className="h-4 w-4 shrink-0" />
              <span>{t(`language.${current}`)}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuRadioGroup
              value={current}
              onValueChange={(code) => void i18n.changeLanguage(code)}
            >
              <DropdownMenuRadioItem value="zh">{t("language.zh")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="en">{t("language.en")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="pt">{t("language.pt")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-secondary"
              aria-label={t("version.menuAria")}
            >
              <span>{t(`version.${version}`)}</span>
              <ChevronDown className="h-4 w-4 shrink-0 opacity-60" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="min-w-[200px]">
            <DropdownMenuRadioGroup
              value={version}
              onValueChange={(v) => setVersion(v as AppVersion)}
            >
              <DropdownMenuRadioItem value="br">{t("version.br")}</DropdownMenuRadioItem>
              <DropdownMenuRadioItem value="ssl">{t("version.ssl")}</DropdownMenuRadioItem>
            </DropdownMenuRadioGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
};
