import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  BarChart3,
  Star,
  FileText,
  Tag,
  UtensilsCrossed,
  ClipboardList,
  Store,
  Users,
  DollarSign,
  Settings,
  GraduationCap,
  PanelLeftClose,
} from "lucide-react";

export const AppSidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  const navSections = [
    {
      label: t("sidebar.analysis"),
      items: [
        { icon: BarChart3, label: t("sidebar.analytics"), path: "/analytics" },
        { icon: Star, label: t("sidebar.customerFeedback"), path: "/feedback" },
        { icon: FileText, label: t("sidebar.reports"), path: "/reports" },
      ],
    },
    {
      label: t("sidebar.marketing"),
      items: [{ icon: Tag, label: t("sidebar.promotions"), path: "/promotions" }],
    },
    {
      label: t("sidebar.menu"),
      items: [{ icon: UtensilsCrossed, label: t("sidebar.menuItem"), path: "/" }],
    },
    {
      label: t("sidebar.order"),
      items: [{ icon: ClipboardList, label: t("sidebar.orders"), path: "/orders" }],
    },
    {
      label: t("sidebar.storeSetting"),
      items: [
        { icon: Store, label: t("sidebar.store"), path: "/store" },
        { icon: Users, label: t("sidebar.users"), path: "/users" },
        { icon: DollarSign, label: t("sidebar.finance"), path: "/finance" },
      ],
    },
    {
      label: t("sidebar.storeSetting"),
      items: [
        { icon: Settings, label: t("sidebar.settings"), path: "/settings" },
        { icon: GraduationCap, label: t("sidebar.academy"), path: "/academy" },
      ],
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") return location.pathname === "/" || location.pathname.startsWith("/menu");
    return location.pathname.startsWith(path);
  };

  return (
    <aside className="flex w-56 flex-col border-r border-sidebar-border bg-sidebar">
      <div className="flex-1 overflow-auto px-3 py-4">
        <button
          disabled
          className="mb-4 flex w-full cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-muted-foreground/50"
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-sm font-medium">{t("sidebar.overview")}</span>
        </button>

        {navSections.map((section, sIdx) => (
          <div key={sIdx} className="mb-2">
            <p className="mb-1 px-3 text-[10px] font-medium uppercase tracking-wider text-sidebar-muted">
              {section.label}
            </p>
            {section.items.map((item) => {
              const active = isActive(item.path);
              const disabled = item.path !== "/";
              return (
                <button
                  key={item.path}
                  onClick={() => !disabled && navigate(item.path)}
                  disabled={disabled}
                  className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
                    active
                      ? "bg-primary font-semibold text-primary-foreground"
                      : disabled
                        ? "cursor-not-allowed text-muted-foreground/50"
                        : "text-sidebar-foreground hover:bg-secondary"
                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <div className="border-t border-sidebar-border px-3 py-3">
        <button className="flex items-center gap-2 px-3 py-1 text-sm text-sidebar-muted hover:text-sidebar-foreground">
          <PanelLeftClose className="h-4 w-4" />
          <span>{t("sidebar.foldNavigation")}</span>
        </button>
      </div>
    </aside>
  );
};
