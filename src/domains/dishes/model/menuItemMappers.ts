import type { AddOnGroup, AddOnItem, ComboPortion, MenuItem } from "@/contexts/MenuContext";
import { pricePrefixForVersion, type AppVersion } from "@/config/version";

/** 去掉历史数据里名称中的「（2选1）」「(3选1)」「（必选）」等后缀，避免与列表拼接的（必选1～2）重复 */
export const stripOptionGroupNameSuffix = (name: string) =>
  name
    .replace(/\s*[（(]\s*\d+\s*选\s*\d+\s*[）)]\s*/g, "")
    .replace(/\s*[（(]\s*必选\s*[）)]\s*/g, "")
    .trim();

/** 列表展示：饮品（必选1～2），由净名称 + required + min/max 拼出 */
export const formatAddOnGroupListLabel = (
  group: Pick<AddOnGroup, "name" | "required" | "min" | "max">,
  tags: { required: string; optional: string },
  /** 已解析的展示用名称（多语言）；不传则用 group.name */
  resolvedBaseName?: string,
) => {
  const base = stripOptionGroupNameSuffix(resolvedBaseName ?? group.name);
  const min = group.min ?? "1";
  const max = group.max ?? "1";
  const mid = group.required ? tags.required : tags.optional;
  return `${base}（${mid}${min}～${max}）`;
};

export type DishFormDraft = {
  itemType: "items" | "combo";
  comboPortion: ComboPortion;
  comboOriginalPrice: string;
  comboDiscountPercent: string;
  itemName: string;
  pdvCode: string;
  description: string;
  selectedCategoryIdx: string;
  deliveryPrice: string;
  pickupPrice: string;
  pickupEnabled: boolean;
  stockType: "unlimited" | "custom";
  stockCount: string;
  canSoldSeparately: "yes" | "no";
};

/** 去掉 R$ / MX$ 等展示前缀，便于解析与按版本改写前缀 */
export const stripCurrencyPrefix = (price: string) =>
  price.replace(/^\s*/, "").replace(/^(R\$|MX\$)\s?/i, "");

export function formatPriceAmount(amountPart: string, version: AppVersion): string {
  const p = pricePrefixForVersion(version);
  const t = amountPart.trim();
  if (!t) return `${p}0.00`;
  return `${p}${t}`;
}

function remapMenuItemPrices(item: MenuItem, version: AppVersion): MenuItem {
  const fmt = (s: string) => formatPriceAmount(stripCurrencyPrefix(s), version);
  return {
    ...item,
    deliveryPrice: fmt(item.deliveryPrice),
    pickupPrice: fmt(item.pickupPrice),
    comboOriginalPrice:
      item.comboOriginalPrice !== undefined && item.comboOriginalPrice !== ""
        ? stripCurrencyPrefix(item.comboOriginalPrice)
        : item.comboOriginalPrice,
    addOns: item.addOns?.map((g) => ({
      ...g,
      items: g.items.map((sub) => ({
        ...sub,
        deliveryPrice: fmt(sub.deliveryPrice),
        pickupPrice: fmt(sub.pickupPrice),
      })),
    })),
  };
}

/** 按当前市场版本统一内置菜单中的价格前缀（页面刷新后随 localStorage 版本生效） */
export function remapCategoryItemsForAppVersion(
  items: Record<number, MenuItem[]>,
  version: AppVersion,
): Record<number, MenuItem[]> {
  const next: Record<number, MenuItem[]> = {};
  for (const key of Object.keys(items)) {
    const idx = Number(key);
    next[idx] = (items[idx] || []).map((item) => remapMenuItemPrices(item, version));
  }
  return next;
}

export type ModifierGroupForm = {
  id: string;
  name: string;
  customId: string;
  min: string;
  max: string;
  allowMultiple: boolean;
  required: boolean;
  collapsed: boolean;
  items: ModifierGroupItemForm[];
  status: "unsaved" | "error" | "saved";
  cardQuantity?: string;
};

export type ModifierGroupItemForm = {
  name: string;
  price: string;
  maxQty: string;
};

export const mapAddOnsToModifierGroups = (
  addOns: AddOnGroup[] | undefined,
  version: AppVersion,
): ModifierGroupForm[] => {
  if (!addOns || addOns.length === 0) return [];
  const zero = formatPriceAmount("", version);
  return addOns.map((group, idx) => ({
    id: `mg-load-${idx}-${group.name}-${Date.now()}`,
    name: stripOptionGroupNameSuffix(group.name),
    customId: "",
    min: group.min ?? "1",
    max: group.max ?? "1",
    allowMultiple: false,
    required: group.required,
    collapsed: false,
    cardQuantity: "1",
    items: group.items.map((sub: AddOnItem) => ({
      name: sub.name,
      price: sub.deliveryPrice || sub.pickupPrice || zero,
      maxQty:
        sub.stock === "999" || sub.stock === "Unlimited" ? "unlimited" : sub.stock || "-",
    })),
    status: "saved" as const,
  }));
};

export const mapMenuItemToFormDraft = (
  item: MenuItem,
  categoryIndex: number,
): DishFormDraft => ({
  itemType: item.itemType ?? "items",
  comboPortion: item.comboPortion ?? "single",
  comboOriginalPrice: stripCurrencyPrefix(item.comboOriginalPrice ?? ""),
  comboDiscountPercent: item.comboDiscountPercent ?? "",
  itemName: item.title,
  pdvCode: item.pdvCode || "",
  description: item.description || "",
  selectedCategoryIdx: String(categoryIndex),
  deliveryPrice: stripCurrencyPrefix(item.deliveryPrice),
  pickupPrice: stripCurrencyPrefix(item.pickupPrice),
  pickupEnabled: item.pickupPrice !== "",
  stockType: item.stock === "Unlimited" ? "unlimited" : "custom",
  stockCount: item.stock === "Unlimited" ? "" : item.stock,
  canSoldSeparately: item.notSoldIndependently ? "no" : "yes",
});

type BuildPayloadInput = {
  appVersion: AppVersion;
  itemType: "items" | "combo";
  comboPortion: ComboPortion;
  comboOriginalPrice: string;
  comboDiscountPercent: string;
  itemName: string;
  pdvCode: string;
  description: string;
  deliveryPrice: string;
  pickupEnabled: boolean;
  pickupPrice: string;
  stockType: "unlimited" | "custom";
  stockCount: string;
  canSoldSeparately: "yes" | "no";
};

export const buildMenuItemPayload = ({
  appVersion,
  itemType,
  comboPortion,
  comboOriginalPrice,
  comboDiscountPercent,
  itemName,
  pdvCode,
  description,
  deliveryPrice,
  pickupEnabled,
  pickupPrice,
  stockType,
  stockCount,
  canSoldSeparately,
}: BuildPayloadInput): Omit<MenuItem, "id"> => {
  const formattedDeliveryPrice = formatPriceAmount(deliveryPrice, appVersion);
  const formattedPickupPrice =
    pickupEnabled && pickupPrice.trim()
      ? formatPriceAmount(pickupPrice, appVersion)
      : formattedDeliveryPrice;

  return {
    title: itemName.trim(),
    image: itemType === "combo" ? "🍱" : "🍽️",
    tags: [],
    deliveryPrice: formattedDeliveryPrice,
    pickupPrice: formattedPickupPrice,
    stock: stockType === "unlimited" ? "Unlimited" : stockCount || "0",
    status: true,
    addOns: [],
    itemType,
    ...(itemType === "combo"
      ? {
          comboPortion,
          comboOriginalPrice: comboOriginalPrice.trim(),
          comboDiscountPercent: comboDiscountPercent.trim(),
        }
      : {}),
    pdvCode,
    description,
    notSoldIndependently: canSoldSeparately === "no",
  };
};

/** SSL「添加菜品」存储：主菜行 + 从关联菜快照的选项组（保存进村套餐 addOns） */
export type SslLinkedDishSnapshot = {
  main: { name: string; deliveryPrice: string; pickupPrice: string };
  addOnGroups: AddOnGroup[];
};

/** SSL 主菜卡片在 addOns 中的包装组：组名与唯一子项名一致 */
export function isSslMainWrapperAddOnGroup(g: AddOnGroup): boolean {
  const sub = g.items?.[0];
  if (!sub || g.items.length !== 1) return false;
  return stripOptionGroupNameSuffix(g.name) === stripOptionGroupNameSuffix(sub.name);
}

export type SslComboLinkedChunk = { main: AddOnGroup; nested: AddOnGroup[] };

/**
 * 将套餐 addOns 按 SSL「关联菜」卡片切分（主包装组 + 紧随其后的非包装组）。
 * 若非连续包装结构则返回 null，交由常规选项组稿面解析。
 */
export function parseSslComboLinkedChunks(item: MenuItem): SslComboLinkedChunk[] | null {
  const addOns = item.addOns ?? [];
  if (addOns.length === 0) return null;
  const chunks: SslComboLinkedChunk[] = [];
  let i = 0;
  while (i < addOns.length) {
    const w = addOns[i];
    if (!isSslMainWrapperAddOnGroup(w)) return null;
    i++;
    const nested: AddOnGroup[] = [];
    while (i < addOns.length && !isSslMainWrapperAddOnGroup(addOns[i])) {
      nested.push(addOns[i]);
      i++;
    }
    chunks.push({ main: w, nested });
  }
  return chunks;
}
