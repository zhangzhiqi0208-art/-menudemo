import type { AddOnGroup, AddOnItem, MenuItem } from "@/contexts/MenuContext";

export type DishFormDraft = {
  itemType: "items" | "combo";
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
    name: group.name,
    customId: "",
    min: group.min ?? "1",
    max: group.max ?? "1",
    allowMultiple: false,
    required: group.required,
    collapsed: false,
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
  itemType: item.itemType || (item.addOns && item.addOns.length > 0 ? "combo" : "items"),
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
    pdvCode,
    description,
    notSoldIndependently: canSoldSeparately === "no",
  };
};
