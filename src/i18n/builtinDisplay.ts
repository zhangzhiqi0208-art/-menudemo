import type { TFunction } from "i18next";
import type { AddOnGroup, AddOnItem, Category, MenuItem } from "@/contexts/MenuContext";

/** 与初始数据「招牌汉堡」分类对应，用于高价/平价菜图标等逻辑（不依赖展示文案） */
export const BUILTIN_BURGER_CATEGORY_LOCALE_KEY = "builtin.categories.c0";

export function displayCategoryName(cat: Category, t: TFunction): string {
  if (cat.localeKey) return t(cat.localeKey);
  return cat.name;
}

export function displayItemTitle(
  item: Pick<MenuItem, "title" | "localeTitleKey">,
  t: TFunction,
): string {
  if (item.localeTitleKey) return t(item.localeTitleKey);
  return item.title;
}

export function displayAddonGroupName(
  group: Pick<AddOnGroup, "name" | "localeNameKey">,
  t: TFunction,
): string {
  if (group.localeNameKey) return t(group.localeNameKey);
  return group.name;
}

export function displayAddonItemName(
  sub: Pick<AddOnItem, "name" | "localeNameKey">,
  t: TFunction,
): string {
  if (sub.localeNameKey) return t(sub.localeNameKey);
  return sub.name;
}

export function displayAddonItemWarning(
  sub: Pick<AddOnItem, "warning" | "localeWarningKey">,
  t: TFunction,
): string | undefined {
  if (!sub.warning) return undefined;
  if (sub.localeWarningKey) return t(sub.localeWarningKey);
  return sub.warning;
}

/** 独立菜 title 或加购子项 name（中文规范名）→ 当前语言展示名 */
export function displayLinkedMenuName(
  itemsByCat: Record<number, MenuItem[]>,
  canonicalName: string,
  t: TFunction,
): string {
  for (const key of Object.keys(itemsByCat)) {
    for (const item of itemsByCat[Number(key)] || []) {
      if (item.title === canonicalName) return displayItemTitle(item, t);
      for (const g of item.addOns || []) {
        for (const s of g.items) {
          if (s.name === canonicalName) return displayAddonItemName(s, t);
        }
      }
    }
  }
  return canonicalName;
}
