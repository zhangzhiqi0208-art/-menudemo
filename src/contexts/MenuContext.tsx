import React, { createContext, useContext, useState, ReactNode } from "react";

export interface AddOnItem {
  name: string;
  deliveryPrice: string;
  pickupPrice: string;
  stock: string;
  status: boolean;
  warning?: string;
}

export interface AddOnGroup {
  name: string;
  required: boolean;
  min?: string;
  max?: string;
  items: AddOnItem[];
}

/** 套餐份量（仅套餐类型菜品使用） */
export type ComboPortion = "single" | "double" | "large" | "xlarge" | "other";

export interface MenuItem {
  id: string;
  title: string;
  image: string;
  tags: string[];
  availability?: string;
  notSoldIndependently?: boolean;
  reviewStatus?: "under_review";
  marketingActivity?: boolean;
  deliveryPrice: string;
  pickupPrice: string;
  stock: string;
  status: boolean;
  addOns?: AddOnGroup[];
  // Detail fields
  itemType?: "items" | "combo";
  /** 套餐份量，新建套餐默认一人份 */
  comboPortion?: ComboPortion;
  /** 套餐：设定原价（纯数字字符串，不含 R$） */
  comboOriginalPrice?: string;
  /** 套餐：折扣百分比，如 "20" 表示 20% */
  comboDiscountPercent?: string;
  pdvCode?: string;
  description?: string;
  category?: string;
}

export interface Category {
  name: string;
  count: number;
}

const initialCategories: Category[] = [
  { name: "🍔招牌汉堡", count: 5 },
  { name: "🍟超值套餐", count: 4 },
  { name: "🐮每日限量菜品～售完即止", count: 1 },
  { name: "🧑‍🍳独家原创", count: 2 },
  { name: "🍗小食饮料", count: 9 },
  { name: "🥬加料专区", count: 1 },
];

const initialItemsByCategory: Record<number, MenuItem[]> = {
  // 0: 🍔招牌汉堡
  0: [
    { id: "0-1", title: "双层碎牛肉汉堡", image: "🍔", tags: [], deliveryPrice: "R$32.90", pickupPrice: "R$28.90", stock: "Unlimited", status: true, addOns: [] },
    { id: "0-2", title: "三层碎牛肉汉堡", image: "🍔", tags: [], deliveryPrice: "R$42.90", pickupPrice: "R$38.90", stock: "500", status: true, addOns: [] },
    { id: "0-3", title: "培根芝士碎牛肉汉堡", image: "🍔", tags: [], deliveryPrice: "R$36.90", pickupPrice: "R$32.90", stock: "300", status: true, addOns: [] },
    { id: "0-4", title: "蛋堡碎牛肉汉堡", image: "🍔", tags: [], deliveryPrice: "R$34.90", pickupPrice: "R$30.90", stock: "200", status: false, addOns: [] },
    { id: "0-5", title: "奶酪碎牛肉汉堡", image: "🍔", tags: [], deliveryPrice: "R$35.90", pickupPrice: "R$31.90", stock: "Unlimited", status: true, addOns: [] },
  ],
  // 1: 🍟超值套餐
  1: [
    { id: "1-1", title: "碎牛肉汉堡套餐", image: "🍔", tags: [], deliveryPrice: "R$9999.99", pickupPrice: "R$9999.99", stock: "Unlimited", status: true, addOns: [] },
    {
      id: "1-2", title: "N! 酥脆鸡块套餐", image: "🍗",
      tags: [], deliveryPrice: "R$100.00", pickupPrice: "R$80.00", stock: "900", status: true,
      addOns: [
        {
          name: "小食（必选）", required: true, min: "1", max: "1",
          items: [
            { name: "炸鸡", deliveryPrice: "R$20.00", pickupPrice: "R$18.00", stock: "0", status: true, warning: "库存不足" },
          ],
        },
        {
          name: "沙拉（3选1）", required: false, min: "1", max: "3",
          items: [
            { name: "蔬菜沙拉", deliveryPrice: "R$40.00", pickupPrice: "R$36.00", stock: "999", status: false, warning: "该菜品因含有违禁词已被平台下架。" },
            { name: "芝士沙拉", deliveryPrice: "R$20.00", pickupPrice: "R$18.00", stock: "999", status: true },
            { name: "经典沙拉", deliveryPrice: "R$20.00", pickupPrice: "R$18.00", stock: "999", status: false },
          ],
        },
        {
          name: "饮品（2选1）", required: false, min: "1", max: "2",
          items: [
            { name: "可口可乐", deliveryPrice: "R$6.00", pickupPrice: "R$4.00", stock: "999", status: true },
            { name: "雪碧", deliveryPrice: "R$6.00", pickupPrice: "R$4.00", stock: "999", status: false },
          ],
        },
      ],
    },
    { id: "1-3", title: "芝士汉堡120g套餐", image: "🍔", tags: [], deliveryPrice: "R$100.00", pickupPrice: "R$80.00", stock: "900", status: false, addOns: [] },
    { id: "1-4", title: "芝士汉堡180g套餐", image: "🍔", tags: [], deliveryPrice: "R$100.00", pickupPrice: "R$80.00", stock: "0", status: true, addOns: [] },
  ],
  // 2: 🐮每日限量菜品～售完即止
  2: [
    { id: "2-1", title: "圣诞特别版松露汉堡", image: "🎄", tags: [], deliveryPrice: "R$59.90", pickupPrice: "R$49.90", stock: "50", status: true, addOns: [] },
  ],
  // 3: 🧑‍🍳独家原创
  3: [
    { id: "3-1", title: "N! 原创汉堡 200g", image: "🍔", tags: [], deliveryPrice: "R$34.90", pickupPrice: "R$30.90", stock: "Unlimited", status: true, addOns: [] },
    { id: "3-2", title: "N! 秘制酱料汉堡", image: "🍔", tags: [], deliveryPrice: "R$39.90", pickupPrice: "R$35.90", stock: "350", status: true, addOns: [] },
  ],
  // 4: 🍗小食饮料
  4: [
    { id: "4-1", title: "经典薯条（清新海盐）", image: "🍟", tags: [], deliveryPrice: "R$14.90", pickupPrice: "R$12.90", stock: "Unlimited", status: true, addOns: [] },
    { id: "4-2", title: "乡村薯条（芝士培根）", image: "🍟", tags: [], deliveryPrice: "R$22.90", pickupPrice: "R$18.90", stock: "400", status: true, addOns: [] },
    { id: "4-3", title: "洋葱圈 12个", image: "🧅", tags: [], deliveryPrice: "R$18.90", pickupPrice: "R$15.90", stock: "250", status: false, addOns: [] },
    { id: "4-6", title: "炸鸡", image: "🍗", tags: [], deliveryPrice: "R$20.00", pickupPrice: "R$18.00", stock: "0", status: true, addOns: [] },
    { id: "4-8", title: "蔬菜沙拉", image: "🥬", tags: [], deliveryPrice: "R$40.00", pickupPrice: "R$36.00", stock: "999", status: false, addOns: [] },
    { id: "4-9", title: "芝士沙拉", image: "🥬", tags: [], deliveryPrice: "R$20.00", pickupPrice: "R$18.00", stock: "999", status: true, addOns: [] },
    { id: "4-10", title: "经典沙拉", image: "🥬", tags: [], deliveryPrice: "R$20.00", pickupPrice: "R$18.00", stock: "999", status: false, addOns: [] },
    { id: "4-11", title: "可口可乐", image: "🥤", tags: [], deliveryPrice: "R$6.00", pickupPrice: "R$4.00", stock: "999", status: true, addOns: [] },
    { id: "4-12", title: "雪碧", image: "🥤", tags: [], deliveryPrice: "R$6.00", pickupPrice: "R$4.00", stock: "999", status: false, addOns: [] },
  ],
  // 5: 🥬加料专区
  5: [
    { id: "5-1", title: "布朗尼配香草冰淇淋", image: "🍫", tags: [], deliveryPrice: "R$18.90", pickupPrice: "R$15.90", stock: "150", status: true, addOns: [] },
  ],
};

/**
 * 子菜 name 与某顶层菜品 title 相同时，以顶层菜品（独立菜）的 status 为准校正套餐内子项，避免初始数据不一致。
 */
function normalizeLinkedSubStatusesToStandalone(
  items: Record<number, MenuItem[]>,
): Record<number, MenuItem[]> {
  const titleToStatus = new Map<string, boolean>();
  for (const key of Object.keys(items)) {
    for (const item of items[Number(key)] || []) {
      if (!titleToStatus.has(item.title)) {
        titleToStatus.set(item.title, item.status);
      }
    }
  }

  const next: Record<number, MenuItem[]> = {};
  for (const key of Object.keys(items)) {
    const idx = Number(key);
    next[idx] = (items[idx] || []).map((item) => {
      if (!item.addOns?.length) return item;
      return {
        ...item,
        addOns: item.addOns.map((g) => ({
          ...g,
          items: g.items.map((s) => {
            if (!titleToStatus.has(s.name)) return s;
            return { ...s, status: titleToStatus.get(s.name)! };
          }),
        })),
      };
    });
  }
  return next;
}

interface MenuContextType {
  categories: Category[];
  setCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  categoryItems: Record<number, MenuItem[]>;
  setCategoryItems: React.Dispatch<React.SetStateAction<Record<number, MenuItem[]>>>;
  addItem: (categoryIndex: number, item: MenuItem) => void;
  updateItem: (itemId: string, updates: Partial<MenuItem>) => void;
  moveItemToCategory: (itemId: string, toCategoryIndex: number, updates?: Partial<MenuItem>) => void;
  getItemById: (itemId: string) => { item: MenuItem; categoryIndex: number } | null;
}

const MenuContext = createContext<MenuContextType | null>(null);

export const useMenu = () => {
  const ctx = useContext(MenuContext);
  if (!ctx) throw new Error("useMenu must be used within MenuProvider");
  return ctx;
};

export const MenuProvider = ({ children }: { children: ReactNode }) => {
  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [categoryItems, setCategoryItems] = useState<Record<number, MenuItem[]>>(() =>
    normalizeLinkedSubStatusesToStandalone(initialItemsByCategory),
  );

  const addItem = (categoryIndex: number, item: MenuItem) => {
    setCategoryItems(prev => ({
      ...prev,
      [categoryIndex]: [...(prev[categoryIndex] || []), item],
    }));
    setCategories(prev => prev.map((cat, idx) =>
      idx === categoryIndex ? { ...cat, count: cat.count + 1 } : cat
    ));
  };

  const updateItem = (itemId: string, updates: Partial<MenuItem>) => {
    setCategoryItems(prev => {
      const newItems = { ...prev };
      for (const key in newItems) {
        newItems[key] = newItems[key].map(item =>
          item.id === itemId ? { ...item, ...updates } : item
        );
      }
      return newItems;
    });
  };

  const moveItemToCategory = (
    itemId: string,
    toCategoryIndex: number,
    updates: Partial<MenuItem> = {},
  ) => {
    let fromCategoryIndex: number | null = null;

    setCategoryItems((prev) => {
      const next = { ...prev };

      // Find current location
      for (const key in next) {
        const idx = Number(key);
        if ((next[idx] || []).some((i) => i.id === itemId)) {
          fromCategoryIndex = idx;
          break;
        }
      }

      if (fromCategoryIndex === null) return prev;
      if (fromCategoryIndex === toCategoryIndex) {
        // Same category: just update fields.
        next[toCategoryIndex] = (next[toCategoryIndex] || []).map((i) =>
          i.id === itemId ? { ...i, ...updates } : i,
        );
        return next;
      }

      const fromItems = next[fromCategoryIndex] || [];
      const moving = fromItems.find((i) => i.id === itemId);
      if (!moving) return prev;

      next[fromCategoryIndex] = fromItems.filter((i) => i.id !== itemId);
      next[toCategoryIndex] = [...(next[toCategoryIndex] || []), { ...moving, ...updates }];

      return next;
    });

    // Keep category counts in sync.
    if (fromCategoryIndex !== null && fromCategoryIndex !== toCategoryIndex) {
      setCategories((prev) =>
        prev.map((cat, idx) => {
          if (idx === fromCategoryIndex) return { ...cat, count: Math.max(0, cat.count - 1) };
          if (idx === toCategoryIndex) return { ...cat, count: cat.count + 1 };
          return cat;
        }),
      );
    }
  };

  const getItemById = (itemId: string): { item: MenuItem; categoryIndex: number } | null => {
    for (const key in categoryItems) {
      const found = categoryItems[key].find(i => i.id === itemId);
      if (found) return { item: found, categoryIndex: Number(key) };
    }
    return null;
  };

  return (
    <MenuContext.Provider value={{ categories, setCategories, categoryItems, setCategoryItems, addItem, updateItem, moveItemToCategory, getItemById }}>
      {children}
    </MenuContext.Provider>
  );
};
