export type AppVersion = "v1" | "v2";

export const VERSION_CONFIG: Record<
  AppVersion,
  {
    themeKey: "v1" | "v2";
    features: {
      dishAdvancedPricing: boolean;
      dishComboSupport: boolean;
    };
  }
> = {
  v1: {
    themeKey: "v1",
    features: {
      dishAdvancedPricing: false,
      dishComboSupport: false,
    },
  },
  v2: {
    themeKey: "v2",
    features: {
      dishAdvancedPricing: true,
      dishComboSupport: true,
    },
  },
};

