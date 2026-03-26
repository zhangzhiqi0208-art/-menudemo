import type { AddOnGroup, AddOnItem, ComboPortion, MenuItem } from "@/contexts/MenuContext";

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

export const stripCurrencyPrefix = (price: string) => price.replace(/^R\$\s?/, "");

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
): ModifierGroupForm[] => {
  if (!addOns || addOns.length === 0) return [];
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
      price: sub.deliveryPrice || sub.pickupPrice || "R$0.00",
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
  const formattedDeliveryPrice = `R$${deliveryPrice.trim()}`;
  const formattedPickupPrice =
    pickupEnabled && pickupPrice.trim()
      ? `R$${pickupPrice.trim()}`
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
