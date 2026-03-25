import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminLayout from "@/components/AdminLayout";
import emptyMenuImage from "@/assets/empty-menu.png";
import noDishImagePlaceholder from "@/assets/无图菜品.jpg";
import expensiveDishIcon from "@/assets/高价菜.svg";
import affordableDishIcon from "@/assets/平价菜.svg";
import batchActivateIcon from "@/assets/批量操作/批量-上架.svg";
import batchRemoveIcon from "@/assets/批量操作/批量-下架.svg";
import batchMoreIcon from "@/assets/批量操作/批量-更多.svg";
import batchCancelIcon from "@/assets/批量操作/批量-取消.svg";
import sortIcon from "@/assets/排序.svg";
import {
  Search,
  Plus,
  Settings2,
  MoreHorizontal,
  Clock,
  List,
  Pencil,
  Trash2,
  Clock4,
  AlertCircle,
  Hourglass,
  Megaphone,
  Lock,
  Check,
  ChevronDown,
  X,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { TruncatedText } from "@/components/TruncatedText";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CategorySortDialog } from "@/components/CategorySortDialog";
import { ItemSortDialog } from "@/components/ItemSortDialog";
import ImageUploadDialog from "@/components/ImageUploadDialog";
import { useMenu, type AddOnGroup, type AddOnItem, type MenuItem } from "@/contexts/MenuContext";
import { formatAddOnGroupListLabel } from "@/domains/dishes/model/menuItemMappers";
import { cn } from "@/lib/utils";

function isItemImageUrl(image: unknown): boolean {
  if (typeof image !== "string") return false;
  return /^(https?|blob|data):/.test(image) || (image.includes("/") && image.length > 4);
}

/** 独立菜 title 与某父菜加购子项 name 一致 */
function isLinkedStandaloneAndSub(
  itemsByCat: Record<number, MenuItem[]>,
  name: string,
): boolean {
  let hasStandalone = false;
  let hasSub = false;
  for (const key of Object.keys(itemsByCat)) {
    for (const item of itemsByCat[Number(key)] || []) {
      if (item.title === name) hasStandalone = true;
      if (item.addOns?.some((g) => g.items.some((s) => s.name === name)))
        hasSub = true;
    }
  }
  return hasStandalone && hasSub;
}

/** 包含该子项名称的父菜标题（去重、遍历顺序稳定） */
function collectParentTitlesForLinkedName(
  itemsByCat: Record<number, MenuItem[]>,
  name: string,
): string[] {
  const titles: string[] = [];
  for (const key of Object.keys(itemsByCat)) {
    for (const item of itemsByCat[Number(key)] || []) {
      if (!item.addOns?.some((g) => g.items.some((s) => s.name === name)))
        continue;
      if (!titles.includes(item.title)) titles.push(item.title);
    }
  }
  return titles;
}

function formatParentTitlesBracketed(parents: string[]): string {
  return parents.map((p) => `【${p}】`).join("");
}

const DishesListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { categories, setCategories, categoryItems, setCategoryItems, updateItem } =
    useMenu();

  const [linkedUnlistDialog, setLinkedUnlistDialog] = useState<{
    itemName: string;
    parentTitles: string[];
  } | null>(null);

  const applyLinkedItemStatusEverywhere = (itemName: string, status: boolean) => {
    setCategoryItems((prev) => {
      const next: Record<number, MenuItem[]> = {};
      for (const key of Object.keys(prev)) {
        const idx = Number(key);
        next[idx] = (prev[idx] || []).map((item) => {
          let updated: MenuItem = { ...item };
          if (updated.title === itemName) {
            updated = { ...updated, status };
          }
          if (updated.addOns?.length) {
            updated = {
              ...updated,
              addOns: updated.addOns.map((g) => ({
                ...g,
                items: g.items.map((s) =>
                  s.name === itemName ? { ...s, status } : s,
                ),
              })),
            };
          }
          return updated;
        });
      }
      return next;
    });
  };

  const confirmLinkedUnlist = () => {
    if (!linkedUnlistDialog) return;
    applyLinkedItemStatusEverywhere(linkedUnlistDialog.itemName, false);
    setLinkedUnlistDialog(null);
  };
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const cat = (location.state as { selectCategory?: number })?.selectCategory;
    return typeof cat === "number" && cat >= 0 ? cat : 0;
  });
  useEffect(() => {
    const cat = (location.state as { selectCategory?: number })?.selectCategory;
    if (typeof cat === "number" && cat >= 0) {
      setSelectedCategory(cat);
    }
  }, [location.state]);

  // Batch operations (remote capability)
  const [batchMode, setBatchMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [imageDialogItemId, setImageDialogItemId] = useState<string | null>(null);
  const [imageDialogInitialUrl, setImageDialogInitialUrl] = useState<string | null>(null);

  const enterBatchMode = () => {
    setBatchMode(true);
    setSelectedItems(new Set());
  };

  const exitBatchMode = () => {
    setBatchMode(false);
    setSelectedItems(new Set());
  };

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems((prev) => {
      const next = new Set(prev);
      if (next.has(itemId)) next.delete(itemId);
      else next.add(itemId);
      return next;
    });
  };

  const toggleAllInCategory = (catIdx: number) => {
    const items = categoryItems[catIdx] || [];
    const allSelected =
      items.length > 0 && items.every((i) => selectedItems.has(i.id));
    setSelectedItems((prev) => {
      const next = new Set(prev);
      items.forEach((i) => {
        if (allSelected) next.delete(i.id);
        else next.add(i.id);
      });
      return next;
    });
  };

  const getSelectedCountForCategory = (catIdx: number): number => {
    const items = categoryItems[catIdx] || [];
    return items.filter((i) => selectedItems.has(i.id)).length;
  };

  const totalSelected = selectedItems.size;
  const hasSelection = totalSelected > 0;

  const [searchTerm, setSearchTerm] = useState("");
  /** 空数组表示「全部」；非空时为多选分类索引（与左侧菜单分类一致） */
  const [filterCategoryIndices, setFilterCategoryIndices] = useState<number[]>([]);
  const [filterSaleStatus, setFilterSaleStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [filterSaleAttribute, setFilterSaleAttribute] = useState<
    "all" | "standalone" | "not-standalone"
  >("all");

  useEffect(() => {
    setFilterCategoryIndices((prev) =>
      prev.filter((i) => i >= 0 && i < categories.length),
    );
  }, [categories.length]);

  const toggleFilterCategoryIndex = (idx: number) => {
    setFilterCategoryIndices((prev) => {
      if (prev.includes(idx)) return prev.filter((i) => i !== idx);
      return [...prev, idx].sort((a, b) => a - b);
    });
  };

  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<
    number | null
  >(null);
  const [editCategoryName, setEditCategoryName] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCategoryIndex, setDeletingCategoryIndex] = useState<
    number | null
  >(null);

  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const addInputRef = useRef<HTMLInputElement>(null);

  const [sortDialogOpen, setSortDialogOpen] = useState(false);
  const [itemSortDialogOpen, setItemSortDialogOpen] = useState(false);

  const [editingPriceItemId, setEditingPriceItemId] = useState<string | null>(
    null,
  );
  const [editingPriceValue, setEditingPriceValue] = useState("");
  const [editingPriceError, setEditingPriceError] = useState(false);
  const [editingPriceWarning, setEditingPriceWarning] = useState(false);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const priceEditContainerRef = useRef<HTMLDivElement>(null);

  const keyword = searchTerm.toLowerCase().trim();

  const itemPassesToolbarFilters = (item: MenuItem) => {
    if (keyword) {
      const title = (item.title ?? "").toLowerCase();
      if (!title.includes(keyword)) return false;
    }
    if (filterSaleStatus === "active" && item.status !== true) return false;
    if (filterSaleStatus === "inactive" && item.status !== false) return false;
    const notIndep = item.notSoldIndependently === true;
    if (filterSaleAttribute === "standalone" && notIndep) return false;
    if (filterSaleAttribute === "not-standalone" && !notIndep) return false;
    return true;
  };

  const categoryHasMatch = (idx: number) => {
    const noNarrowing =
      !keyword &&
      filterSaleStatus === "all" &&
      filterSaleAttribute === "all";
    if (noNarrowing) return true;
    const items = categoryItems[idx] || [];
    return items.some((item) => itemPassesToolbarFilters(item));
  };

  const getCategoryVisibleCount = (idx: number) => {
    const items = categoryItems[idx] || [];
    return items.filter((item) => itemPassesToolbarFilters(item)).length;
  };

  useEffect(() => {
    if (editingPriceItemId && priceInputRef.current) {
      priceInputRef.current.focus();
      priceInputRef.current.select();
    }
  }, [editingPriceItemId]);

  useEffect(() => {
    if (!editingPriceItemId) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        priceEditContainerRef.current &&
        !priceEditContainerRef.current.contains(e.target as Node)
      ) {
        setEditingPriceWarning(true);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [editingPriceItemId]);

  const startEditPrice = (item: MenuItem) => {
    setEditingPriceItemId(item.id);
    const raw = item.deliveryPrice.replace(/^R\$/, "");
    setEditingPriceValue(raw);
    setEditingPriceError(false);
    setEditingPriceWarning(false);
  };

  const confirmEditPrice = () => {
    if (!editingPriceValue.trim()) {
      setEditingPriceError(true);
      setEditingPriceWarning(false);
      return;
    }
    if (editingPriceItemId) {
      updateItem(editingPriceItemId, {
        deliveryPrice: `R$${editingPriceValue.trim()}`,
      });
    }
    cancelEditPrice();
  };

  const cancelEditPrice = () => {
    setEditingPriceItemId(null);
    setEditingPriceValue("");
    setEditingPriceError(false);
    setEditingPriceWarning(false);
  };

  const handleEditCategory = (idx: number) => {
    setEditingCategoryIndex(idx);
    setEditCategoryName(categories[idx].name);
    setEditDialogOpen(true);
  };

  const handleSaveCategory = () => {
    if (editCategoryName.trim() === "" || editingCategoryIndex === null) return;
    setCategories((prev) =>
      prev.map((cat, idx) =>
        idx === editingCategoryIndex
          ? { ...cat, name: editCategoryName.trim() }
          : cat,
      ),
    );
    setEditDialogOpen(false);
    setEditingCategoryIndex(null);
    setEditCategoryName("");
  };

  const handleDeleteCategory = (idx: number) => {
    setDeletingCategoryIndex(idx);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingCategoryIndex === null) return;
    setCategories((prev) => prev.filter((_, idx) => idx !== deletingCategoryIndex));
    setCategoryItems((prev) => {
      const newItems = { ...prev };
      delete newItems[deletingCategoryIndex];
      const reindexed: Record<number, MenuItem[]> = {};
      const remaining = Object.entries(newItems)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([, items]) => items);
      remaining.forEach((items, i) => {
        reindexed[i] = items;
      });
      return reindexed;
    });
    if (selectedCategory >= deletingCategoryIndex && selectedCategory > 0) {
      setSelectedCategory((prev) => prev - 1);
    }
    setDeleteDialogOpen(false);
    setDeletingCategoryIndex(null);
  };

  const handleAddCategory = () => {
    if (!newCategoryName.trim()) return;
    const newIdx = categories.length;
    setCategories((prev) => [
      ...prev,
      { name: newCategoryName.trim(), count: 0 },
    ]);
    setCategoryItems((prev) => ({ ...prev, [newIdx]: [] }));
    setSelectedCategory(newIdx);
    setAddDialogOpen(false);
    setNewCategoryName("");
  };

  const handleSortSave = (reordered: { name: string; count: number }[]) => {
    const oldIndexMap = reordered.map((r) =>
      categories.findIndex((c) => c.name === r.name),
    );
    const newCategoryItemsMap: Record<number, MenuItem[]> = {};
    oldIndexMap.forEach((oldIdx, newIdx) => {
      newCategoryItemsMap[newIdx] = categoryItems[oldIdx] || [];
    });
    setCategories(reordered);
    setCategoryItems(newCategoryItemsMap);
    setSelectedCategory(0);
  };

  const handleItemSortSave = (
    reordered: { id: string; title: string; image: string }[],
  ) => {
    const currentItems = categoryItems[selectedCategory] || [];
    const newItems = reordered
      .map((r) => currentItems.find((i) => i.id === r.id)!)
      .filter(Boolean);
    setCategoryItems((prev) => ({ ...prev, [selectedCategory]: newItems }));
  };

  useEffect(() => {
    if (addDialogOpen && addInputRef.current) addInputRef.current.focus();
  }, [addDialogOpen]);

  useEffect(() => {
    if (editDialogOpen && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editDialogOpen]);

  useEffect(() => {
    if (!keyword) return;
    if (filterCategoryIndices.length > 0) {
      const first = filterCategoryIndices.find((idx) => categoryHasMatch(idx));
      if (first !== undefined && first !== selectedCategory) {
        setSelectedCategory(first);
      }
      return;
    }
    if (categoryHasMatch(selectedCategory)) return;

    const fallbackIndex = categories.findIndex((_, idx) =>
      categoryHasMatch(idx),
    );
    if (fallbackIndex !== -1) {
      setSelectedCategory(fallbackIndex);
    }
  }, [
    keyword,
    categories,
    categoryItems,
    selectedCategory,
    filterCategoryIndices,
    filterSaleStatus,
    filterSaleAttribute,
  ]);

  useEffect(() => {
    if (filterCategoryIndices.length === 0) return;
    if (filterCategoryIndices.includes(selectedCategory)) return;
    const next =
      filterCategoryIndices.find((i) => categoryHasMatch(i)) ??
      filterCategoryIndices[0];
    setSelectedCategory(next);
  }, [
    filterCategoryIndices,
    selectedCategory,
    categoryItems,
    keyword,
    filterSaleStatus,
    filterSaleAttribute,
  ]);

  const mainItems = useMemo(() => {
    const indices =
      filterCategoryIndices.length > 0
        ? filterCategoryIndices
        : [selectedCategory];
    return indices
      .flatMap((idx) => categoryItems[idx] ?? [])
      .filter((item) => itemPassesToolbarFilters(item));
  }, [
    filterCategoryIndices,
    selectedCategory,
    categoryItems,
    keyword,
    filterSaleStatus,
    filterSaleAttribute,
  ]);

  const itemIdToCategoryIndex = useMemo(() => {
    const map = new Map<string, number>();
    for (const key of Object.keys(categoryItems)) {
      const idx = Number(key);
      for (const it of categoryItems[idx] || []) map.set(it.id, idx);
    }
    return map;
  }, [categoryItems]);

  /** 右侧表头：多选分类时展示合并标题与总条数 */
  const mainPanelHeading = useMemo(() => {
    if (filterCategoryIndices.length === 0) {
      return {
        title: categories[selectedCategory]?.name ?? "",
        count: getCategoryVisibleCount(selectedCategory),
      };
    }
    if (filterCategoryIndices.length === 1) {
      const i = filterCategoryIndices[0];
      return {
        title: categories[i]?.name ?? "",
        count: getCategoryVisibleCount(i),
      };
    }
    return {
      title: filterCategoryIndices
        .map((i) => categories[i]?.name)
        .filter(Boolean)
        .join("、"),
      count: filterCategoryIndices.reduce(
        (sum, i) => sum + getCategoryVisibleCount(i),
        0,
      ),
    };
  }, [
    filterCategoryIndices,
    selectedCategory,
    categories,
    categoryItems,
    keyword,
    filterSaleStatus,
    filterSaleAttribute,
  ]);

  type DisplayRow =
    | { type: "main"; item: MenuItem }
    | {
        type: "subGroupHeader";
        parentItem: MenuItem;
        groupIdx: number;
        group: AddOnGroup;
      }
    | {
        type: "sub";
        parentItem: MenuItem;
        groupIdx: number;
        subIdx: number;
        sub: AddOnItem;
      };

  const displayRows: DisplayRow[] = useMemo(() => {
    const rows: DisplayRow[] = [];
    const snackTitles = new Set((categoryItems[4] || []).map((i) => i.title));
    for (const item of mainItems) {
      rows.push({ type: "main", item });
      // 无搜索词时选项组只在主行内嵌展示；有搜索词时用扁平行展示匹配的子项，避免重复
      if (!keyword || !item.addOns?.length) continue;
      for (let gi = 0; gi < item.addOns.length; gi++) {
        const group = item.addOns[gi];
        let subGroupHeaderPushed = false;
        for (let si = 0; si < group.items.length; si++) {
          const sub = group.items[si];
          const subMatch = sub.name.toLowerCase().includes(keyword);
          if (!subMatch) continue;
          const parentCatIdx =
            itemIdToCategoryIndex.get(item.id) ?? selectedCategory;
          if (parentCatIdx === 1 && snackTitles.has(sub.name)) continue;
          if (!subGroupHeaderPushed) {
            rows.push({
              type: "subGroupHeader",
              parentItem: item,
              groupIdx: gi,
              group,
            });
            subGroupHeaderPushed = true;
          }
          rows.push({
            type: "sub",
            parentItem: item,
            groupIdx: gi,
            subIdx: si,
            sub,
          });
        }
      }
    }
    return rows;
  }, [mainItems, keyword, selectedCategory, categoryItems, itemIdToCategoryIndex]);

  const filteredItems = mainItems;

  const hasAnySearchResult = keyword
    ? filterCategoryIndices.length > 0
      ? filterCategoryIndices.some((idx) => categoryHasMatch(idx))
      : categories.some((_, idx) => categoryHasMatch(idx))
    : true;

  const hasActiveToolbarFilters =
    filterSaleStatus !== "all" ||
    filterSaleAttribute !== "all" ||
    filterCategoryIndices.length > 0;

  const hasAnyFilteredItemInMenu =
    filterCategoryIndices.length > 0
      ? filterCategoryIndices.some((idx) =>
          (categoryItems[idx] || []).some((item) =>
            itemPassesToolbarFilters(item),
          ),
        )
      : categories.some((_, idx) =>
          (categoryItems[idx] || []).some((item) =>
            itemPassesToolbarFilters(item),
          ),
        );

  const categoryFilterTriggerLabel = useMemo(() => {
    if (filterCategoryIndices.length === 0) return "全部分类";
    if (filterCategoryIndices.length === 1) {
      return categories[filterCategoryIndices[0]]?.name ?? "全部分类";
    }
    return `已选 ${filterCategoryIndices.length} 个分类`;
  }, [filterCategoryIndices, categories]);

  const parseBRL = (price: string) => {
    const raw = (price ?? "").replace(/^R\$\s?/, "").trim();
    if (!raw) return 0;

    const lastDot = raw.lastIndexOf(".");
    const lastComma = raw.lastIndexOf(",");

    let normalized = raw;

    // If both separators exist, the last one is the decimal separator.
    if (lastDot !== -1 && lastComma !== -1) {
      const decimalSep = lastDot > lastComma ? "." : ",";
      const thousandSep = decimalSep === "." ? "," : ".";
      normalized = normalized.split(thousandSep).join("");
      normalized = normalized.replace(decimalSep, ".");
    } else if (lastComma !== -1) {
      // Only comma exists: treat it as decimal separator, remove dots as thousand separators.
      normalized = normalized.split(".").join("");
      normalized = normalized.replace(",", ".");
    } else if (lastDot !== -1) {
      // Only dot exists: usually decimal (e.g. 42.90). If it looks like a thousand separator, strip it.
      const parts = normalized.split(".");
      if (parts.length === 2) {
        const fraction = parts[1] ?? "";
        if (fraction.length === 3) {
          // 1.234 -> thousand separator
          normalized = parts.join("");
        }
      } else if (parts.length > 2) {
        // 1.234.567 -> thousand separators
        normalized = parts.join("");
      }
    }

    normalized = normalized.replace(/[^\d.-]/g, "");
    const value = Number(normalized);
    return Number.isFinite(value) ? value : 0;
  };

  const expensiveTooltipText = "高价菜";
  const affordableTooltipText = "平价菜";

  /** 仅「招牌汉堡」分类下的菜品展示高价菜/平价菜图标（合并多分类时按菜品所属分类判断） */
  const showPriceTierIconForItem = (itemId: string) => {
    const catIdx = itemIdToCategoryIndex.get(itemId) ?? selectedCategory;
    return (categories[catIdx]?.name ?? "").includes("招牌汉堡");
  };

  const totalMenuItemCount = useMemo(
    () =>
      categories.reduce(
        (sum, _, catIdx) => sum + (categoryItems[catIdx]?.length ?? 0),
        0,
      ),
    [categories, categoryItems],
  );

  const PriceWithIcon = ({
    price,
    onPriceClick,
    enablePriceHoverBg = false,
    showTierIcon = false,
    expensiveTooltipOverride,
  }: {
    price: string;
    onPriceClick?: () => void;
    enablePriceHoverBg?: boolean;
    showTierIcon?: boolean;
    /** 高价菜图标悬停文案（仅当价格档位为高价时生效） */
    expensiveTooltipOverride?: string;
  }) => {
    const value = parseBRL(price);
    const icon = value > 40 ? expensiveDishIcon : affordableDishIcon;
    const isExpensive = value > 40;
    const expensiveLabel = expensiveTooltipOverride ?? expensiveTooltipText;
    const alt = isExpensive ? expensiveLabel : "平价菜";
    const tooltipText = isExpensive ? expensiveLabel : affordableTooltipText;

    return (
      <span className="flex min-w-0 w-full items-center justify-end gap-0.5 whitespace-nowrap tabular-nums">
        {onPriceClick ? (
          <button
            type="button"
            onClick={onPriceClick}
            className={[
              "whitespace-nowrap rounded py-1 text-right transition-colors",
              /* 与无按钮的子项价格同一右缘，避免比表头/主行更靠右 */
              "px-0",
              enablePriceHoverBg ? "hover:bg-secondary" : "",
            ].join(" ")}
          >
            {price}
          </button>
        ) : (
          <span className="whitespace-nowrap">{price}</span>
        )}

        {showTierIcon && (
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  className="shrink-0"
                  onClick={(e) => e.stopPropagation()}
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <img src={icon} alt={alt} className="h-5 w-5" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="top">
                <p>{tooltipText}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="min-h-full bg-white p-6">
        <div className="mb-4 flex gap-6 border-b border-border">
          <button className="border-b-2 border-foreground pb-2 text-base font-semibold">
            {t("menuList.storeMenu")}
          </button>
          <button className="pb-2 text-sm text-muted-foreground hover:text-foreground">
            {t("menuList.items")}
          </button>
          <button className="pb-2 text-sm text-muted-foreground hover:text-foreground">
            {t("menuList.modifications")}
          </button>
        </div>

        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold">
              N! Burger Bistro Menu ({totalMenuItemCount})
            </h1>
            <span
              className="hidden flex items-center gap-1 rounded-full border border-border px-3 py-0.5 text-xs text-muted-foreground"
              style={{ backgroundColor: "#FFFADB" }}
            >
              {t("menuList.affordableCert")}
            </span>
          </div>
          <div className="hidden flex items-center gap-2">
            <button className="rounded-lg border border-border p-2 hover:bg-secondary">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="rounded-lg border border-border p-2 hover:bg-secondary">
              <List className="h-4 w-4 text-muted-foreground" />
            </button>
            <button className="rounded-lg border border-border p-2 hover:bg-secondary">
              <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="mb-[16px] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("menuList.search")}
                className="h-9 w-[140px] shrink-0 pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-3">
              <Select
                value={filterSaleStatus === "all" ? undefined : filterSaleStatus}
                onValueChange={(v) =>
                  setFilterSaleStatus(
                    (v as "all" | "active" | "inactive") ?? "all",
                  )
                }
              >
                <SelectTrigger
                  className={cn(
                    "h-9 w-[140px] shrink-0",
                    filterSaleStatus === "all" && "[&>span]:text-[#BABABF]",
                  )}
                >
                  <SelectValue placeholder="全部售卖状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部售卖状态</SelectItem>
                  <SelectItem value="active">{t("menuList.active")}</SelectItem>
                  <SelectItem value="inactive">
                    {t("menuList.inactive")}
                  </SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={
                  filterSaleAttribute === "all"
                    ? undefined
                    : filterSaleAttribute
                }
                onValueChange={(v) =>
                  setFilterSaleAttribute(
                    (v as "all" | "standalone" | "not-standalone") ?? "all",
                  )
                }
              >
                <SelectTrigger
                  className={cn(
                    "h-9 w-[140px] shrink-0",
                    filterSaleAttribute === "all" &&
                      "[&>span]:text-[#BABABF]",
                  )}
                >
                  <SelectValue placeholder="全部售卖属性" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">全部售卖属性</SelectItem>
                  <SelectItem value="standalone">可独立售卖</SelectItem>
                  <SelectItem value="not-standalone">不可独立售卖</SelectItem>
                </SelectContent>
              </Select>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      "flex h-9 w-[140px] shrink-0 items-center justify-between rounded-md border border-[#BABABF] bg-transparent px-3 py-2 text-sm focus:outline-none focus:border-black data-[state=open]:border-black disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
                    )}
                  >
                    <span
                      className={cn(
                        filterCategoryIndices.length === 0 && "text-[#BABABF]",
                      )}
                    >
                      {categoryFilterTriggerLabel}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50" />
                  </button>
                </PopoverTrigger>
                <PopoverContent align="start" className="w-56 p-2">
                  <div className="max-h-60 space-y-0.5 overflow-y-auto">
                    <label className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent">
                      <Checkbox
                        checked={filterCategoryIndices.length === 0}
                        onCheckedChange={(checked) => {
                          if (checked) setFilterCategoryIndices([]);
                        }}
                      />
                      <span>全部分类</span>
                    </label>
                    {categories.map((cat, idx) => (
                      <label
                        key={idx}
                        className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-accent"
                      >
                        <Checkbox
                          checked={filterCategoryIndices.includes(idx)}
                          onCheckedChange={() => toggleFilterCategoryIndex(idx)}
                        />
                        <span className="min-w-0 truncate">{cat.name}</span>
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="h-9 gap-2"
              onClick={batchMode ? undefined : enterBatchMode}
            >
              <Settings2 className="h-4 w-4" />
              {t("menuList.batchOperations")}
            </Button>
            <Button
              className="h-9 gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={() => navigate("/menu/new")}
            >
              <Plus className="h-4 w-4" />
              {t("menuList.addItem")}
            </Button>
          </div>
        </div>

        {keyword && !hasAnySearchResult ? (
          <div className="flex flex-1 flex-col items-center justify-center py-32">
            <img
              src={emptyMenuImage}
              alt="Empty menu"
              className="mb-6 h-32 w-32 object-contain"
            />
            <p className="mb-4 text-base font-semibold text-foreground">
              暂无搜索结果
            </p>
          </div>
        ) : hasActiveToolbarFilters && !hasAnyFilteredItemInMenu ? (
          <div className="flex flex-1 flex-col items-center justify-center py-32">
            <img
              src={emptyMenuImage}
              alt="Empty menu"
              className="mb-6 h-32 w-32 object-contain"
            />
            <p className="mb-4 text-base font-semibold text-foreground">
              暂无符合筛选条件的菜品
            </p>
          </div>
        ) : (
        <div className="flex gap-6">
          <div className="w-56 shrink-0">
            <div className="mb-2 flex h-[48px] items-center justify-between">
              <h2 className="text-base font-semibold">{t("menuList.category")}</h2>
              <div className="flex gap-1">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="rounded border border-border p-1 hover:bg-secondary"
                        onClick={() => setSortDialogOpen(true)}
                      >
                        <img src={sortIcon} alt="" className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{t("menuList.sortCategories")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="rounded border border-border p-1 hover:bg-secondary"
                        onClick={() => setAddDialogOpen(true)}
                      >
                        <Plus className="h-3.5 w-3.5 text-[#212121]" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{t("menuList.addCategory")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>
            <div className="space-y-0.5">
              {categories.map((cat, idx) => {
                if (
                  filterCategoryIndices.length > 0 &&
                  !filterCategoryIndices.includes(idx)
                ) {
                  return null;
                }
                if (!categoryHasMatch(idx)) return null;
                const selectedCount = getSelectedCountForCategory(idx);
                return (
                  <div
                    key={idx}
                    onClick={() => setSelectedCategory(idx)}
                    className={`group relative flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors cursor-pointer ${
                      selectedCategory === idx
                        ? "bg-foreground font-semibold text-card"
                        : "text-foreground hover:bg-secondary"
                    }`}
                  >
                    <TruncatedText
                      text={cat.name}
                      className="flex-1 min-w-0 mr-2"
                    />
                    <span
                      className={`text-xs shrink-0 text-right transition-all group-hover:mr-7 ${
                        selectedCategory === idx
                          ? "text-card/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {batchMode
                        ? selectedCount > 0
                          ? `${t("menuList.selected")} ${selectedCount}`
                          : getCategoryVisibleCount(idx)
                        : getCategoryVisibleCount(idx)}
                    </span>
                    {!batchMode && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            onClick={(e) => e.stopPropagation()}
                            className={`absolute right-2 rounded p-1 opacity-0 group-hover:opacity-100 transition-opacity ${
                              selectedCategory === idx
                                ? "hover:bg-card/20"
                                : "hover:bg-secondary"
                            }`}
                          >
                            <MoreHorizontal
                              className={`h-4 w-4 ${
                                selectedCategory === idx
                                  ? "text-card"
                                  : "text-muted-foreground"
                              }`}
                            />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          align="start"
                          side="right"
                          className="w-40"
                        >
                          <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCategory(idx);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                            {t("menuList.edit")}
                          </DropdownMenuItem>
                          <DropdownMenuItem className="gap-2 cursor-pointer">
                            <Clock4 className="h-4 w-4" />
                            {t("menuList.setPinnedTime")}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="gap-2 text-destructive focus:text-destructive cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteCategory(idx);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                            {t("menuList.delete")}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            {!batchMode && (
              <div className="mb-2 flex h-[48px] items-center justify-between">
                <h2 className="flex min-w-0 items-center gap-2 text-base font-semibold">
                  <span className="min-w-0 truncate" title={mainPanelHeading.title}>
                    {mainPanelHeading.title}
                  </span>
                  <span className="shrink-0 font-normal text-muted-foreground">
                    {mainPanelHeading.count}
                    {t("menuList.itemsCount")}
                  </span>
                </h2>
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        type="button"
                        onClick={() => setItemSortDialogOpen(true)}
                        className="rounded border border-border p-1 hover:bg-secondary"
                      >
                        <img src={sortIcon} alt="" className="h-3.5 w-3.5 shrink-0" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top">
                      <p>{t("menuList.sortItems")}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {batchMode && (
              <div className="mb-2 flex items-center gap-2 rounded-lg px-4 py-2" style={{ backgroundColor: "#F9F9F9" }}>
                <span
                  className="text-base font-semibold"
                  style={{ color: hasSelection ? "hsl(50, 100%, 50%)" : undefined }}
                >
                  {t("menuList.totalSelected")} {totalSelected}
                </span>
                <div className="h-4 w-px shrink-0 bg-border" />
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!hasSelection}
                  className="h-8 gap-1 border-0 bg-transparent text-black shadow-none hover:bg-transparent hover:text-black enabled:[&_img]:brightness-0 enabled:[&_img]:opacity-100 disabled:text-[#8A8A91] disabled:opacity-100 disabled:hover:text-[#8A8A91] disabled:[&_img]:opacity-[0.54]"
                  onClick={() => {
                    selectedItems.forEach((id) => updateItem(id, { status: true }));
                    exitBatchMode();
                  }}
                >
                  <img src={batchActivateIcon} alt="" className="h-3.5 w-3.5 shrink-0" />
                  {t("menuList.activate")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!hasSelection}
                  className="h-8 gap-1 border-0 bg-transparent text-black shadow-none hover:bg-transparent hover:text-black enabled:[&_img]:brightness-0 enabled:[&_img]:opacity-100 disabled:text-[#8A8A91] disabled:opacity-100 disabled:hover:text-[#8A8A91] disabled:[&_img]:opacity-[0.54]"
                  onClick={() => {
                    selectedItems.forEach((id) =>
                      updateItem(id, { status: false })
                    );
                    exitBatchMode();
                  }}
                >
                  <img src={batchRemoveIcon} alt="" className="h-3.5 w-3.5 shrink-0" />
                  {t("menuList.remove")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={!hasSelection}
                      className="h-8 gap-1 border-0 bg-transparent text-black shadow-none hover:bg-transparent hover:text-black enabled:[&_img]:brightness-0 enabled:[&_img]:opacity-100 disabled:text-[#8A8A91] disabled:opacity-100 disabled:hover:text-[#8A8A91] disabled:[&_img]:opacity-[0.54]"
                    >
                      <img src={batchMoreIcon} alt="" className="h-3.5 w-3.5 shrink-0" />
                      {t("menuList.more")}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem>
                      {t("menuList.editActiveTime")}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      {t("menuList.cancelAvailability")}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      {t("menuList.editHoursOfSale")}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      {t("menuList.editCategory")}
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      {t("menuList.editPrice")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <div className="h-4 w-px shrink-0 bg-border" />
                <button
                  onClick={exitBatchMode}
                  className="flex items-center gap-1 text-sm text-black hover:text-black"
                >
                  <img src={batchCancelIcon} alt="" className="h-3.5 w-3.5 shrink-0" />
                  {t("menuList.cancelBatchOperation")}
                </button>
              </div>
            )}

            {batchMode ? (
              <div className="grid grid-cols-[32px_1fr_160px_auto] items-center gap-6 px-4 pb-2 text-xs text-muted-foreground">
                <div className="flex items-center justify-center">
                  <Checkbox
                    checked={
                      (categoryItems[selectedCategory] || []).length > 0 &&
                      (categoryItems[selectedCategory] || []).every((i) =>
                        selectedItems.has(i.id),
                      )
                    }
                    onCheckedChange={() =>
                      toggleAllInCategory(selectedCategory)
                    }
                  />
                </div>
                <span className="leading-none">{t("menuList.title")}</span>
                <div className="flex min-w-0 w-full items-center justify-end">
                  <span className="leading-none">{t("menuList.delivery")}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-[46px] shrink-0 text-left leading-none">{t("menuList.status")}</span>
                  <span className="flex size-8 shrink-0" aria-hidden />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-[1fr_160px_auto] items-center gap-6 pl-0 pr-4 pb-2 text-xs text-muted-foreground">
                <span className="leading-none">{t("menuList.title")}</span>
                <div className="flex min-w-0 w-full items-center justify-end">
                  <span className="leading-none">{t("menuList.delivery")}</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="w-[46px] shrink-0 text-left leading-none">{t("menuList.status")}</span>
                  <span className="flex size-8 shrink-0" aria-hidden />
                </div>
              </div>
            )}

            {(filteredItems || []).length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-20">
                <img
                  src={emptyMenuImage}
                  alt="Empty menu"
                  className="mb-6 h-32 w-32 object-contain"
                />
                <p className="mb-4 text-base font-semibold text-foreground">
                  {keyword && !hasAnySearchResult
                    ? "暂无搜索结果"
                    : hasActiveToolbarFilters && (filteredItems || []).length === 0
                      ? "暂无符合筛选条件的菜品"
                      : t("menuList.startBuilding")}
                </p>
                {!keyword && (
                  <Button
                    onClick={() => navigate("/menu/new", { state: { fromCategory: selectedCategory } })}
                    className="bg-[hsl(50,100%,50%)] text-foreground hover:bg-[hsl(50,100%,45%)] font-medium"
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    {t("menuList.addItem")}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                  {displayRows.map((row) =>
                    row.type === "main" ? (
                    <div key={row.item.id}>
                      <div
                        className={`grid items-center gap-6 px-4 py-3 ${
                          batchMode
                            ? "grid-cols-[32px_1fr_160px_auto]"
                            : "grid-cols-[1fr_160px_auto]"
                        }`}
                      >
                        {batchMode && (
                          <div className="flex items-center justify-center">
                            <Checkbox
                              checked={selectedItems.has(row.item.id)}
                              onCheckedChange={() =>
                                toggleItemSelection(row.item.id)
                              }
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-3 min-w-0">
                          {(() => {
                            const hasImage = isItemImageUrl(row.item.image);
                            return (
                          <div
                            className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-2xl cursor-pointer hover:opacity-80"
                            onClick={() => {
                              if (!batchMode) {
                                setImageDialogItemId(row.item.id);
                                setImageDialogInitialUrl(hasImage ? (row.item.image as string) : null);
                                setImageDialogOpen(true);
                              }
                            }}
                            role="button"
                            aria-label={hasImage ? t("newItem.editImage") : t("newItem.addImage")}
                          >
                            {(() => {
                              if (hasImage) {
                                return (
                                  <>
                                    <img
                                      src={row.item.image as string}
                                      alt=""
                                      className="h-full w-full object-cover"
                                      onError={(e) => {
                                        e.currentTarget.style.display = "none";
                                        const fb = e.currentTarget.nextElementSibling as HTMLElement;
                                        if (fb) fb.classList.remove("hidden");
                                      }}
                                    />
                                    <img src={noDishImagePlaceholder} alt="" className="absolute inset-0 h-full w-full object-cover rounded-lg border border-[#D9D9DE] hidden" aria-hidden />
                                  </>
                                );
                              }
                              return <img src={noDishImagePlaceholder} alt="" className="h-full w-full object-cover rounded-lg border border-[#D9D9DE]" />;
                            })()}
                          </div>
                            );
                          })()}
                          <div className="min-w-0 flex-1">
                            <p
                              className={`text-sm font-medium cursor-pointer hover:underline truncate ${
                                !row.item.status
                                  ? "text-muted-foreground/50"
                                  : ""
                              }`}
                              onClick={() => {
                                if (batchMode) return;
                                navigate(`/menu/edit/${row.item.id}`);
                              }}
                              title={row.item.title}
                            >
                              {row.item.title || "-"}
                            </p>
                            {(row.item.reviewStatus ||
                              row.item.marketingActivity ||
                              row.item.availability ||
                              row.item.notSoldIndependently) && (
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {row.item.reviewStatus === "under_review" && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                                    <Hourglass className="h-3 w-3" />
                                    {t("menuList.underReview")}
                                  </span>
                                )}
                                {row.item.marketingActivity && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                                    <Megaphone className="h-3 w-3" />
                                    {t("menuList.inMarketingActivities")}
                                  </span>
                                )}
                                {row.item.availability && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {row.item.availability}
                                  </span>
                                )}
                                {row.item.notSoldIndependently && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                                    <Lock className="h-3 w-3" />
                                    {t("menuList.cannotSoldIndependently")}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {editingPriceItemId === row.item.id ? (
                          <div
                            ref={priceEditContainerRef}
                            className="flex flex-col items-end"
                          >
                            <div className="flex items-center gap-1">
                              <Input
                                ref={priceInputRef}
                                value={editingPriceValue}
                                onChange={(e) => {
                                  setEditingPriceValue(e.target.value);
                                  if (e.target.value.trim())
                                    setEditingPriceError(false);
                                  setEditingPriceWarning(false);
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") confirmEditPrice();
                                  if (e.key === "Escape") cancelEditPrice();
                                }}
                                className={`h-7 w-28 text-right text-sm ${
                                  editingPriceError
                                    ? "border-destructive focus-visible:ring-destructive"
                                    : editingPriceWarning
                                      ? "border-orange-400 focus-visible:ring-orange-400"
                                      : ""
                                }`}
                                placeholder={t("menuList.pleaseEnter")}
                              />
                              <button
                                onClick={confirmEditPrice}
                                className="p-0.5 text-muted-foreground hover:text-foreground"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={cancelEditPrice}
                                className="p-0.5 text-muted-foreground hover:text-foreground"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                            {editingPriceError && (
                              <p className="mt-1 text-xs text-destructive">
                                {t("menuList.noCannotBeEmpty")}
                              </p>
                            )}
                            {editingPriceWarning && !editingPriceError && (
                              <p className="mt-1 text-xs text-orange-400">
                                {t("menuList.pleaseSaveFirst")}
                              </p>
                            )}
                          </div>
                        ) : (
                          <div
                            className={`flex min-w-0 w-full justify-end text-sm ${
                              !row.item.status ? "text-muted-foreground/50" : ""
                            }`}
                          >
                            <PriceWithIcon
                              price={row.item.deliveryPrice}
                              onPriceClick={() => startEditPrice(row.item)}
                              enablePriceHoverBg
                              showTierIcon={showPriceTierIconForItem(row.item.id)}
                              expensiveTooltipOverride={
                                row.item.title === "三层碎牛肉汉堡"
                                  ? "高于堂食价格6.9元"
                                  : undefined
                              }
                            />
                          </div>
                        )}
                        <div className="flex items-center gap-4">
                          <div
                            className="flex w-[46px] shrink-0 items-center"
                            style={{ opacity: !row.item.status ? 2.5 : 1 }}
                          >
                            <Switch
                              checked={row.item.status}
                              onCheckedChange={(checked) => {
                                const name = row.item.title;
                                if (isLinkedStandaloneAndSub(categoryItems, name)) {
                                  if (!checked) {
                                    setLinkedUnlistDialog({
                                      itemName: name,
                                      parentTitles:
                                        collectParentTitlesForLinkedName(
                                          categoryItems,
                                          name,
                                        ),
                                    });
                                    return;
                                  }
                                  applyLinkedItemStatusEverywhere(name, true);
                                  return;
                                }
                                updateItem(row.item.id, { status: checked });
                              }}
                            />
                          </div>
                          <button
                            type="button"
                            className="flex size-8 shrink-0 items-center justify-center rounded p-1 hover:bg-secondary"
                          >
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                          </button>
                        </div>
                      </div>

                      {row.item.addOns &&
                        row.item.addOns.length > 0 &&
                        !keyword && (
                          <div className="flex flex-col border-t border-border bg-[#F7F8FA]">
                            {row.item.addOns.map((group, gi) => (
                              <div
                                key={gi}
                                className={
                                  gi > 0 ? "mt-[8px] border-t border-border" : undefined
                                }
                              >
                                <div
                                  className={`grid items-center gap-6 px-4 pt-2 pb-1 ${
                                    batchMode
                                      ? "grid-cols-[32px_1fr_160px_auto]"
                                      : "grid-cols-[1fr_160px_auto]"
                                  }`}
                                >
                                  {batchMode && (
                                    <div className="flex w-8 shrink-0 items-center justify-center" aria-hidden />
                                  )}
                                  <div className="flex min-w-0 items-center gap-3">
                                    <div
                                      className="h-6 w-12 shrink-0 rounded-lg border border-transparent"
                                      aria-hidden
                                    />
                                    <span className="block text-sm font-medium text-[#212121]">
                                      {formatAddOnGroupListLabel(group, {
                                        required: t("menuList.required"),
                                        optional: t("menuList.addOnGroupOptionalTag"),
                                      })}
                                    </span>
                                  </div>
                                  <div />
                                  <div />
                                </div>
                                {group.items.map((sub, si) => (
                                  <div key={si}>
                                    <div
                                      className={`grid items-center gap-6 px-4 py-[2px] ${
                                        batchMode
                                          ? "grid-cols-[32px_1fr_160px_auto]"
                                          : "grid-cols-[1fr_160px_auto]"
                                      } ${
                                        !sub.status ? "text-muted-foreground/50" : ""
                                      }`}
                                    >
                                      {batchMode && (
                                        <div className="flex w-8 shrink-0 items-center justify-center" aria-hidden />
                                      )}
                                      <div className="flex min-w-0 items-center gap-3">
                                        <div className="h-6 w-12 shrink-0" aria-hidden />
                                        <span className="truncate text-sm">{sub.name}</span>
                                      </div>
                                      <div className="flex min-w-0 w-full justify-end text-sm">
                                        <PriceWithIcon
                                          price={sub.deliveryPrice}
                                          showTierIcon={showPriceTierIconForItem(
                                            row.item.id,
                                          )}
                                        />
                                      </div>
                                      <div className="flex items-center gap-4">
                                        <div
                                          className="flex w-[46px] shrink-0 items-center"
                                          style={{ opacity: !sub.status ? 2.5 : 1 }}
                                        >
                                          <Switch
                                            checked={sub.status}
                                            onCheckedChange={(checked) => {
                                              if (
                                                isLinkedStandaloneAndSub(
                                                  categoryItems,
                                                  sub.name,
                                                )
                                              ) {
                                                applyLinkedItemStatusEverywhere(
                                                  sub.name,
                                                  checked,
                                                );
                                                return;
                                              }
                                              const newAddOns = (row.item.addOns || []).map(
                                                (g, gIdx) =>
                                                  gIdx === gi
                                                    ? {
                                                        ...g,
                                                        items: g.items.map((s, sIdx) =>
                                                          sIdx === si
                                                            ? { ...s, status: checked }
                                                            : s,
                                                        ),
                                                      }
                                                    : g,
                                              );
                                              updateItem(row.item.id, { addOns: newAddOns });
                                            }}
                                          />
                                        </div>
                                        <button
                                          type="button"
                                          className="flex size-8 shrink-0 items-center justify-center rounded p-1 hover:bg-secondary"
                                        >
                                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                        </button>
                                      </div>
                                    </div>
                                    {sub.warning &&
                                      sub.warning.includes("prohibited") && (
                                        <div className="flex gap-6 px-4 pb-1">
                                          {batchMode && (
                                            <div className="w-8 shrink-0" aria-hidden />
                                          )}
                                          <div className="flex min-w-0 flex-1 items-start gap-3">
                                            <div className="h-6 w-12 shrink-0" aria-hidden />
                                            <p className="text-xs text-destructive">
                                              ⛔ {sub.warning}{" "}
                                              <span className="cursor-pointer text-primary-foreground underline">
                                                Go and view details ›
                                              </span>
                                            </p>
                                          </div>
                                        </div>
                                      )}
                                  </div>
                                ))}
                              </div>
                            ))}
                          </div>
                        )}
                    </div>
                  ) : row.type === "subGroupHeader" ? (
                    <div
                      key={`subgh-${row.parentItem.id}-${row.groupIdx}`}
                      className="border-t border-border bg-secondary/30"
                    >
                      <div
                        className={`grid items-center gap-6 px-4 pt-2 pb-1 ${
                          batchMode
                            ? "grid-cols-[32px_1fr_160px_auto]"
                            : "grid-cols-[1fr_160px_auto]"
                        }`}
                      >
                        {batchMode && (
                          <div className="flex w-8 shrink-0 items-center justify-center" aria-hidden />
                        )}
                        <div className="flex min-w-0 items-center gap-3">
                          <div
                            className="h-6 w-12 shrink-0 rounded-lg border border-transparent"
                            aria-hidden
                          />
                          <span className="text-sm font-medium text-[#212121]">
                            {formatAddOnGroupListLabel(row.group, {
                              required: t("menuList.required"),
                              optional: t("menuList.addOnGroupOptionalTag"),
                            })}
                          </span>
                        </div>
                        <div />
                        <div />
                      </div>
                    </div>
                  ) : (
                    <div
                      key={`sub-${row.parentItem.id}-${row.groupIdx}-${row.subIdx}`}
                      className={`grid items-center gap-6 px-4 py-[2px] ${
                        batchMode
                          ? "grid-cols-[32px_1fr_160px_auto]"
                          : "grid-cols-[1fr_160px_auto]"
                      }`}
                    >
                      {batchMode && <div className="flex items-center justify-center" />}
                      <div className="flex items-center gap-3 min-w-0 pl-0">
                        <div className="flex h-6 w-12 shrink-0 items-center justify-center" aria-hidden>
                          <span className="w-12" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-sm font-medium cursor-pointer hover:underline truncate ${
                              !row.sub.status ? "text-muted-foreground/50" : ""
                            }`}
                            onClick={() =>
                              navigate(
                                `/menu/edit/sub/${row.parentItem.id}/${row.groupIdx}/${row.subIdx}`
                              )
                            }
                            title={row.sub.name}
                          >
                            {row.sub.name}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`flex min-w-0 w-full justify-end text-sm ${
                          !row.sub.status ? "text-muted-foreground/50" : ""
                        }`}
                      >
                        <PriceWithIcon
                          price={row.sub.deliveryPrice}
                          showTierIcon={showPriceTierIconForItem(
                            row.parentItem.id,
                          )}
                        />
                      </div>
                      <div className="flex items-center gap-4">
                        <div
                          className="flex w-[46px] shrink-0 items-center"
                          style={{ opacity: !row.sub.status ? 2.5 : 1 }}
                        >
                          <Switch
                            checked={row.sub.status}
                            onCheckedChange={(checked) => {
                              if (
                                isLinkedStandaloneAndSub(
                                  categoryItems,
                                  row.sub.name,
                                )
                              ) {
                                applyLinkedItemStatusEverywhere(
                                  row.sub.name,
                                  checked,
                                );
                                return;
                              }
                              const newAddOns = (row.parentItem.addOns || []).map(
                                (g, gIdx) =>
                                  gIdx === row.groupIdx
                                    ? {
                                        ...g,
                                        items: g.items.map((s, sIdx) =>
                                          sIdx === row.subIdx ? { ...s, status: checked } : s,
                                        ),
                                      }
                                    : g,
                              );
                              updateItem(row.parentItem.id, { addOns: newAddOns });
                            }}
                          />
                        </div>
                        <button
                          type="button"
                          className="flex size-8 shrink-0 items-center justify-center rounded p-1 hover:bg-secondary"
                        >
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>
                    </div>
                  )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        )}

        <Dialog
          open={linkedUnlistDialog != null}
          onOpenChange={(open) => {
            if (!open) setLinkedUnlistDialog(null);
          }}
        >
          <DialogContent className="max-w-[520px] gap-0 overflow-hidden p-0 sm:rounded-xl">
            <div className="flex gap-3 border-b border-border p-6 pb-4 pr-14">
              <div
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF9500] text-[15px] font-bold leading-none text-white"
                aria-hidden
              >
                !
              </div>
              <div className="min-w-0 flex-1 space-y-2 pt-0.5">
                <DialogTitle className="text-left text-base font-bold leading-snug text-foreground">
                  {t("menuList.linkedUnlistTitle")}
                </DialogTitle>
                <DialogDescription className="text-left text-sm leading-relaxed text-muted-foreground">
                  {linkedUnlistDialog
                    ? t("menuList.linkedUnlistBody", {
                        item: linkedUnlistDialog.itemName,
                        parents: formatParentTitlesBracketed(
                          linkedUnlistDialog.parentTitles,
                        ),
                      })
                    : null}
                </DialogDescription>
              </div>
            </div>
            <div className="flex justify-end gap-2 bg-card px-6 py-4">
              <Button
                type="button"
                variant="outline"
                className="h-10 min-w-[100px] border-border bg-background font-semibold text-foreground hover:bg-secondary/80"
                onClick={() => setLinkedUnlistDialog(null)}
              >
                {t("menuList.cancel")}
              </Button>
              <Button
                type="button"
                className="h-10 min-w-[100px] bg-[hsl(50,100%,50%)] font-semibold text-foreground hover:bg-[hsl(50,100%,45%)]"
                onClick={confirmLinkedUnlist}
              >
                {t("menuList.ok")}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("menuList.editCategory")}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                ref={inputRef}
                value={editCategoryName}
                onChange={(e) => setEditCategoryName(e.target.value)}
                placeholder={t("menuList.categoryName")}
                className="h-12"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && editCategoryName.trim())
                    handleSaveCategory();
                }}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                {t("menuList.cancel")}
              </Button>
              <Button
                onClick={handleSaveCategory}
                disabled={!editCategoryName.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t("menuList.ok")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                {t("menuList.deleteCategory")}
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">
              {t("menuList.deleteCategoryWarning")}
            </p>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => setDeleteDialogOpen(false)}
              >
                {t("menuList.cancel")}
              </Button>
              <Button
                onClick={handleConfirmDelete}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t("menuList.ok")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{t("menuList.addCategory")}</DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <Input
                ref={addInputRef}
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder={t("menuList.enterCategoryName")}
                className="h-12"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && newCategoryName.trim())
                    handleAddCategory();
                }}
              />
            </div>
            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                variant="outline"
                onClick={() => {
                  setAddDialogOpen(false);
                  setNewCategoryName("");
                }}
              >
                {t("menuList.cancel")}
              </Button>
              <Button
                onClick={handleAddCategory}
                disabled={!newCategoryName.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t("menuList.ok")}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <CategorySortDialog
          open={sortDialogOpen}
          onOpenChange={setSortDialogOpen}
          categories={categories}
          onSave={handleSortSave}
        />
        <ItemSortDialog
          open={itemSortDialogOpen}
          onOpenChange={setItemSortDialogOpen}
          categoryName={categories[selectedCategory]?.name || ""}
          items={(categoryItems[selectedCategory] || []).map((i) => ({
            id: i.id,
            title: i.title,
            image: i.image,
          }))}
          onSave={handleItemSortSave}
        />
        <ImageUploadDialog
          open={imageDialogOpen}
          onOpenChange={(open) => {
            setImageDialogOpen(open);
            if (!open) {
              setImageDialogItemId(null);
              setImageDialogInitialUrl(null);
            }
          }}
          onImageSelected={(_file, previewUrl) => {
            if (imageDialogItemId) {
              updateItem(imageDialogItemId, { image: previewUrl });
              setImageDialogItemId(null);
              setImageDialogInitialUrl(null);
            }
          }}
          initialImageUrl={imageDialogInitialUrl ?? undefined}
        />
      </div>
    </AdminLayout>
  );
};

export default DishesListPage;


