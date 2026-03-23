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
  items: AddOnItem[];
}

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
  pdvCode?: string;
  description?: string;
  category?: string;
}

export interface Category {
  name: string;
  count: number;
}

const initialCategories: Category[] = [
  { name: "Os Burgers Mais Pedidos da 99", count: 5 },
  { name: "Combos Irresistíveis", count: 4 },
  { name: "Edição Limitada - Prove Antes Que Acabe", count: 1 },
  { name: "Escolhas Impossíveis de Errar", count: 6 },
  { name: "Originais N! Burger - So A Gente Tem", count: 2 },
  { name: "Clássicos - Não Tem Como Errar!", count: 4 },
  { name: "Acompanhamentos", count: 4 },
  { name: "Vai Um Docinho Aí", count: 1 },
];

const initialItemsByCategory: Record<number, MenuItem[]> = {
  0: [
    { id: "0-1", title: "Smash Burger Duplo 200g", image: "🍔", tags: [], deliveryPrice: "R$32.90", pickupPrice: "R$28.90", stock: "Unlimited", status: true, addOns: [] },
    { id: "0-2", title: "Smash Burger Triplo 300g", image: "🍔", tags: [], deliveryPrice: "R$42.90", pickupPrice: "R$38.90", stock: "500", status: true, addOns: [] },
    { id: "0-3", title: "Smash Burger Bacon & Cheddar", image: "🍔", tags: [], deliveryPrice: "R$36.90", pickupPrice: "R$32.90", stock: "300", status: true, addOns: [] },
    { id: "0-4", title: "Smash Burger Egg", image: "🍔", tags: [], deliveryPrice: "R$34.90", pickupPrice: "R$30.90", stock: "200", status: false, addOns: [] },
    { id: "0-5", title: "Smash Burger Catupiry", image: "🍔", tags: [], deliveryPrice: "R$35.90", pickupPrice: "R$31.90", stock: "Unlimited", status: true, addOns: [] },
  ],
  1: [
    { id: "1-1", title: "Combo Smash Burger + Batata + CocaCola", image: "🍔", tags: [], deliveryPrice: "R$9999.99", pickupPrice: "R$9999.99", stock: "Unlimited", status: true, addOns: [] },
    {
      id: "1-2", title: "Combo N! Crispy Chicken + Batata + CocaCola", image: "🍗",
      tags: [], deliveryPrice: "R$100.00", pickupPrice: "R$80.00", stock: "900", status: true,
      addOns: [
        {
          name: "Snack (1of3)", required: true,
          items: [
            { name: "Chicken Pop - Sobrecoxas Empandas C", deliveryPrice: "R$40.00", pickupPrice: "R$36.00", stock: "Unlimited", status: true },
            { name: "Chicken Pop - Molho Barbec", deliveryPrice: "R$20.00", pickupPrice: "R$18.00", stock: "0", status: true, warning: "Low stock" },
            { name: "Chicken Pop - Crocantes", deliveryPrice: "R$20.00", pickupPrice: "R$18.00", stock: "999", status: true },
          ],
        },
        {
          name: "Salad (1of3)", required: false,
          items: [
            { name: "Vegatable Salada", deliveryPrice: "R$40.00", pickupPrice: "R$36.00", stock: "999", status: false, warning: "This dish contained prohibited words and has been removed from the platform." },
            { name: "Chesse Salada", deliveryPrice: "R$20.00", pickupPrice: "R$18.00", stock: "999", status: true },
            { name: "Classic Salad", deliveryPrice: "R$20.00", pickupPrice: "R$18.00", stock: "999", status: true },
          ],
        },
        {
          name: "Beverage (1of2)", required: false,
          items: [
            { name: "CocaCola", deliveryPrice: "R$6.00", pickupPrice: "R$4.00", stock: "999", status: true },
            { name: "Sprite", deliveryPrice: "R$6.00", pickupPrice: "R$4.00", stock: "999", status: true },
          ],
        },
      ],
    },
    { id: "1-3", title: "Combo Cheese Burger 120g + Batatas Rusticas + CocaCola", image: "🍔", tags: [], deliveryPrice: "R$100.00", pickupPrice: "R$80.00", stock: "900", status: false, addOns: [] },
    { id: "1-4", title: "Combo Cheese Burger 180g + Batatas Rusticas + CocaCola", image: "🍔", tags: [], deliveryPrice: "R$100.00", pickupPrice: "R$80.00", stock: "0", status: true, addOns: [] },
  ],
  2: [
    { id: "2-1", title: "Burger Trufado Especial Edição Natalina", image: "🎄", tags: [], deliveryPrice: "R$59.90", pickupPrice: "R$49.90", stock: "50", status: true, addOns: [] },
  ],
  3: [
    { id: "3-1", title: "Classic Burger 150g", image: "🍔", tags: [], deliveryPrice: "R$24.90", pickupPrice: "R$20.90", stock: "Unlimited", status: true, addOns: [] },
    { id: "3-2", title: "Bacon Burger 150g", image: "🥓", tags: [], deliveryPrice: "R$28.90", pickupPrice: "R$24.90", stock: "800", status: true, addOns: [] },
    { id: "3-3", title: "Chicken Burger Crispy", image: "🍗", tags: [], deliveryPrice: "R$26.90", pickupPrice: "R$22.90", stock: "600", status: true, addOns: [] },
    { id: "3-4", title: "Veggie Burger", image: "🥬", tags: [], deliveryPrice: "R$25.90", pickupPrice: "R$21.90", stock: "400", status: true, addOns: [] },
    { id: "3-5", title: "Fish Burger Empanado", image: "🐟", tags: [], deliveryPrice: "R$29.90", pickupPrice: "R$25.90", stock: "200", status: false, addOns: [] },
    { id: "3-6", title: "Double Cheese Burger 240g", image: "🧀", tags: [], deliveryPrice: "R$38.90", pickupPrice: "R$34.90", stock: "0", status: true, addOns: [] },
  ],
  4: [
    { id: "4-1", title: "N! Burger Original 200g", image: "🍔", tags: [], deliveryPrice: "R$34.90", pickupPrice: "R$30.90", stock: "Unlimited", status: true, addOns: [] },
    { id: "4-2", title: "N! Burger Especial com Molho Secreto", image: "🍔", tags: [], deliveryPrice: "R$39.90", pickupPrice: "R$35.90", stock: "350", status: true, addOns: [] },
  ],
  5: [
    { id: "5-1", title: "Hamburger Clássico 120g", image: "🍔", tags: [], deliveryPrice: "R$19.90", pickupPrice: "R$16.90", stock: "Unlimited", status: true, addOns: [] },
    { id: "5-2", title: "Cheeseburger Clássico 120g", image: "🧀", tags: [], deliveryPrice: "R$22.90", pickupPrice: "R$19.90", stock: "Unlimited", status: true, addOns: [] },
    { id: "5-3", title: "X-Bacon Clássico 120g", image: "🥓", tags: [], deliveryPrice: "R$26.90", pickupPrice: "R$22.90", stock: "500", status: true, addOns: [] },
    { id: "5-4", title: "X-Tudo Clássico 150g", image: "🍔", tags: [], deliveryPrice: "R$32.90", pickupPrice: "R$28.90", stock: "300", status: false, addOns: [] },
  ],
  6: [
    { id: "6-1", title: "Batata Frita Média", image: "🍟", tags: [], deliveryPrice: "R$14.90", pickupPrice: "R$12.90", stock: "Unlimited", status: true, addOns: [] },
    { id: "6-2", title: "Batata Rústica com Cheddar e Bacon", image: "🍟", tags: [], deliveryPrice: "R$22.90", pickupPrice: "R$18.90", stock: "400", status: true, addOns: [] },
    { id: "6-3", title: "Onion Rings 12un", image: "🧅", tags: [], deliveryPrice: "R$18.90", pickupPrice: "R$15.90", stock: "250", status: true, addOns: [] },
    { id: "6-4", title: "Nuggets de Frango 10un", image: "🍗", tags: [], deliveryPrice: "R$16.90", pickupPrice: "R$13.90", stock: "0", status: false, addOns: [] },
  ],
  7: [
    { id: "7-1", title: "Brownie com Sorvete de Baunilha", image: "🍫", tags: [], deliveryPrice: "R$18.90", pickupPrice: "R$15.90", stock: "150", status: true, addOns: [] },
  ],
};

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
  const [categoryItems, setCategoryItems] = useState<Record<number, MenuItem[]>>(initialItemsByCategory);

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
