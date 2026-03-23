import { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminLayout from "@/components/AdminLayout";
import emptyMenuImage from "@/assets/empty-menu.png";
import noDishImagePlaceholder from "@/assets/无图菜品.jpg";
import expensiveDishIcon from "@/assets/高价菜.svg";
import affordableDishIcon from "@/assets/平价菜.svg";
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
  X,
  ArrowUp,
  ChevronDown,
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
import { CategorySortDialog } from "@/components/CategorySortDialog";
import { ItemSortDialog } from "@/components/ItemSortDialog";
import { useMenu, type AddOnItem, type MenuItem } from "@/contexts/MenuContext";

const DishesListPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { categories, setCategories, categoryItems, setCategoryItems, updateItem } =
    useMenu();
  const [selectedCategory, setSelectedCategory] = useState(() => {
    const cat = (location.state as { selectCategory?: number })?.selectCategory;
    return typeof cat === "number" && cat >= 0 ? cat : 0;
  });
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

  useEffect(() => {
    const cat = (location.state as { selectCategory?: number })?.selectCategory;
    if (typeof cat === "number" && cat >= 0) {
      setSelectedCategory(cat);
    }
  }, [location.state]);

  // Batch operations (remote capability)
  const [batchMode, setBatchMode] = useState(false);
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

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

  const matchItem = (item: MenuItem) => {
    if (!keyword) return true;
    const title = (item.title ?? "").toLowerCase();
    return title.includes(keyword);
  };

  const categoryHasMatch = (idx: number) => {
    if (!keyword) return true;
    const items = categoryItems[idx] || [];
    return items.some((item) => matchItem(item));
  };

  const getCategoryVisibleCount = (idx: number) => {
    if (!keyword) return categories[idx].count;
    const items = categoryItems[idx] || [];
    return items.filter((item) => matchItem(item)).length;
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

  const toggleExpand = (id: string) => {
    setExpandedItems((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
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
    if (categoryHasMatch(selectedCategory)) return;

    const fallbackIndex = categories.findIndex((_, idx) =>
      categoryHasMatch(idx),
    );
    if (fallbackIndex !== -1) {
      setSelectedCategory(fallbackIndex);
    }
  }, [keyword, categories, categoryItems, selectedCategory]);

  const mainItems =
    categoryItems[selectedCategory]?.filter((item) => matchItem(item)) || [];

  type DisplayRow =
    | { type: "main"; item: MenuItem }
    | {
        type: "sub";
        parentItem: MenuItem;
        groupIdx: number;
        subIdx: number;
        sub: AddOnItem;
      };

  const displayRows: DisplayRow[] = useMemo(() => {
    const rows: DisplayRow[] = [];
    for (const item of mainItems) {
      rows.push({ type: "main", item });
      if (item.addOns?.length) {
        for (let gi = 0; gi < item.addOns.length; gi++) {
          for (let si = 0; si < item.addOns[gi].items.length; si++) {
            const sub = item.addOns[gi].items[si];
            if (keyword) {
              const subMatch = sub.name.toLowerCase().includes(keyword);
              if (!subMatch) continue;
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
    }
    return rows;
  }, [mainItems, keyword]);

  const filteredItems = mainItems;

  const hasAnySearchResult = keyword
    ? categories.some((_, idx) => categoryHasMatch(idx))
    : true;

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

  const PriceWithIcon = ({
    price,
    onPriceClick,
    enablePriceHoverBg = false,
  }: {
    price: string;
    onPriceClick?: () => void;
    enablePriceHoverBg?: boolean;
  }) => {
    const value = parseBRL(price);
    const icon = value > 40 ? expensiveDishIcon : affordableDishIcon;
    const alt = value > 40 ? "高价菜" : "平价菜";
    const tooltipText = value > 40 ? expensiveTooltipText : affordableTooltipText;

    return (
      <span className="inline-flex items-center justify-end gap-0.5 whitespace-nowrap">
        {onPriceClick ? (
          <button
            type="button"
            onClick={onPriceClick}
            className={[
              "whitespace-nowrap rounded px-2 py-1 text-right transition-colors",
              enablePriceHoverBg ? "hover:bg-secondary" : "",
            ].join(" ")}
          >
            {price}
          </button>
        ) : (
          <span className="whitespace-nowrap">{price}</span>
        )}

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
      </span>
    );
  };

  return (
    <AdminLayout>
      <div className="min-h-full bg-white p-6">
        <div className="mb-4 flex gap-6 border-b border-border">
          <button className="border-b-2 border-foreground pb-2 text-sm font-semibold">
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
              {t("menuList.nightBistroMenu")} (66)
            </h1>
            <span
              className="flex items-center gap-1 rounded-full border border-border px-3 py-0.5 text-xs text-muted-foreground"
              style={{ backgroundColor: "#FFFADB" }}
            >
              {t("menuList.affordableCert")}
            </span>
          </div>
          <div className="flex items-center gap-2">
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

        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder={t("menuList.search")}
                className="h-9 w-48 pl-9"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder={t("menuList.itemStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("menuList.all")}</SelectItem>
                <SelectItem value="active">{t("menuList.active")}</SelectItem>
                <SelectItem value="inactive">
                  {t("menuList.inactive")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder={t("menuList.saleStatus")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("menuList.all")}</SelectItem>
                <SelectItem value="on-sale">
                  {t("menuList.onSale")}
                </SelectItem>
              </SelectContent>
            </Select>
            <Select>
              <SelectTrigger className="h-9 w-36">
                <SelectValue placeholder={t("menuList.category")} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("menuList.all")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            {batchMode ? (
              <>
                <span
                  className="text-sm font-semibold"
                  style={{ color: hasSelection ? "hsl(50, 100%, 50%)" : undefined }}
                >
                  {t("menuList.totalSelected")} {totalSelected}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasSelection}
                  className="h-8 gap-1"
                  onClick={() => {
                    selectedItems.forEach((id) => updateItem(id, { status: true }));
                    exitBatchMode();
                  }}
                >
                  <ArrowUp className="h-3.5 w-3.5" />
                  {t("menuList.activate")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={!hasSelection}
                  className="h-8 gap-1"
                  onClick={() => {
                    selectedItems.forEach((id) =>
                      updateItem(id, { status: false })
                    );
                    exitBatchMode();
                  }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t("menuList.remove")}
                </Button>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={!hasSelection}
                      className="h-8 gap-1"
                    >
                      {t("menuList.more")}{" "}
                      <ChevronDown className="h-3.5 w-3.5" />
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
                <button
                  onClick={exitBatchMode}
                  className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                  {t("menuList.cancel")}
                </button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  className="h-9 gap-2"
                  onClick={enterBatchMode}
                >
                  <Settings2 className="h-4 w-4" />
                  {t("menuList.batchOperations")}
                </Button>
                <Button
                  className="h-9 gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
                  onClick={() => navigate("/menu/new", { state: { fromCategory: selectedCategory } })}
                >
                  <Plus className="h-4 w-4" />
                  {t("menuList.addItem")}
                </Button>
              </>
            )}
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
        ) : (
        <div className="flex gap-6">
          <div className="w-56 shrink-0">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("menuList.category")}</h2>
              <div className="flex gap-1">
                <TooltipProvider delayDuration={300}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <button
                        className="rounded border border-border p-1 hover:bg-secondary"
                        onClick={() => setSortDialogOpen(true)}
                      >
                        <List className="h-3.5 w-3.5 text-muted-foreground" />
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
                        <Plus className="h-3.5 w-3.5 text-muted-foreground" />
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
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {categories[selectedCategory].name}{" "}
                <span className="font-normal text-muted-foreground">
                  {getCategoryVisibleCount(selectedCategory)}{" "}
                  {t("menuList.itemsCount")}
                </span>
              </h2>
              <button
                onClick={() => setItemSortDialogOpen(true)}
                className="rounded border border-border p-1 hover:bg-secondary"
              >
                <List className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </div>

            {batchMode ? (
              <div className="grid grid-cols-[32px_1fr_160px_70px_30px] gap-4 border-b border-border px-2 pb-2 text-xs text-muted-foreground">
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
                <span>{t("menuList.title")}</span>
                <span className="text-right">{t("menuList.delivery")}</span>
                <span className="text-center">{t("menuList.status")}</span>
                <span></span>
              </div>
            ) : (
              <div className="grid grid-cols-[1fr_160px_70px_30px] gap-4 border-b border-border px-2 pb-2 text-xs text-muted-foreground">
                <span>{t("menuList.title")}</span>
                <span className="text-right">{t("menuList.delivery")}</span>
                <span className="text-center">{t("menuList.status")}</span>
                <span></span>
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
                <div className="divide-y divide-border">
                  {displayRows.map((row) =>
                    row.type === "main" ? (
                    <div key={row.item.id}>
                      <div
                        className={`grid items-center gap-4 px-2 py-3 ${
                          batchMode
                            ? "grid-cols-[32px_1fr_160px_70px_30px]"
                            : "grid-cols-[1fr_160px_70px_30px]"
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
                          <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-2xl">
                            {(() => {
                              const isImageUrl =
                                typeof row.item.image === "string" &&
                                (/^(https?|blob|data):/.test(row.item.image) ||
                                  (row.item.image.includes("/") && row.item.image.length > 4));
                              if (isImageUrl) {
                                return (
                                  <>
                                    <img
                                      src={row.item.image}
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
                            className={`text-right text-sm whitespace-nowrap ${
                              !row.item.status ? "text-muted-foreground/50" : ""
                            }`}
                          >
                            <PriceWithIcon
                              price={row.item.deliveryPrice}
                              onPriceClick={() => startEditPrice(row.item)}
                              enablePriceHoverBg
                            />
                          </div>
                        )}
                        <div
                          className="flex justify-center"
                          style={{ opacity: !row.item.status ? 2.5 : 1 }}
                        >
                          <Switch
                            checked={row.item.status}
                            onCheckedChange={(checked) => {
                              updateItem(row.item.id, { status: checked });
                            }}
                          />
                        </div>
                        <button className="flex aspect-square items-center justify-center rounded p-1 hover:bg-secondary">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>

                      {row.item.addOns &&
                        row.item.addOns.length > 0 &&
                        row.item.addOns.map((group, gi) => (
                          <div
                            key={gi}
                            className="border-t border-border bg-secondary/30"
                          >
                            <div className="grid grid-cols-[1fr_160px_70px_30px] items-center gap-4 px-2 py-2">
                              <span className="text-xs font-medium text-muted-foreground">
                                {group.name}{" "}
                                ({(() => {
                                  const min = group.min ?? "1";
                                  const max = group.max ?? "1";
                                  const minNum = parseInt(min, 10) || 1;
                                  const maxNum = parseInt(max, 10) || 1;
                                  if (minNum === maxNum) {
                                    return group.required
                                      ? t("menuList.addOnRangeRequiredSingle", { count: minNum })
                                      : t("menuList.addOnRangeOptionalSingle", { count: minNum });
                                  }
                                  return group.required
                                    ? t("menuList.addOnRangeRequired", { min, max })
                                    : t("menuList.addOnRangeOptional", { min, max });
                                })()})
                              </span>
                            </div>
                            {group.items.map((sub, si) => (
                              <div key={si}>
                                <div
                                  className={`grid grid-cols-[1fr_160px_70px_30px] items-center gap-4 px-2 py-2 ${
                                    !sub.status ? "text-muted-foreground/50" : ""
                                  }`}
                                >
                                  <span className="text-sm">
                                    {sub.name}
                                  </span>
                                  <span className="text-right text-sm whitespace-nowrap">
                                    <PriceWithIcon price={sub.deliveryPrice} />
                                  </span>
                                  <div
                                    className="flex justify-center"
                                    style={{ opacity: !sub.status ? 2.5 : 1 }}
                                  >
                                    <Switch
                                      checked={sub.status}
                                      onCheckedChange={(checked) => {
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
                                  <button className="rounded p-1 hover:bg-secondary">
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                </div>
                                {sub.warning &&
                                  sub.warning.includes("prohibited") && (
                                    <p className="mb-1 text-xs text-destructive">
                                      ⛔ {sub.warning}{" "}
                                      <span className="cursor-pointer text-primary-foreground underline">
                                        Go and view details ›
                                      </span>
                                    </p>
                                  )}
                              </div>
                            ))}
                          </div>
                        ))}
                    </div>
                  ) : (
                    <div
                      key={`sub-${row.parentItem.id}-${row.groupIdx}-${row.subIdx}`}
                      className={`grid items-center gap-4 px-2 py-3 ${
                        batchMode
                          ? "grid-cols-[32px_1fr_160px_70px_30px]"
                          : "grid-cols-[1fr_160px_70px_30px]"
                      }`}
                    >
                      {batchMode && <div className="flex items-center justify-center" />}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary">
                          <img src={noDishImagePlaceholder} alt="" className="h-full w-full object-cover rounded-lg border border-[#D9D9DE]" />
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
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {row.parentItem.title} · {row.parentItem.addOns?.[row.groupIdx]?.name}
                          </p>
                        </div>
                      </div>
                      <div
                        className={`text-right text-sm whitespace-nowrap ${
                          !row.sub.status ? "text-muted-foreground/50" : ""
                        }`}
                      >
                        <PriceWithIcon price={row.sub.deliveryPrice} />
                      </div>
                      <div
                        className="flex justify-center"
                        style={{ opacity: !row.sub.status ? 2.5 : 1 }}
                      >
                        <Switch
                          checked={row.sub.status}
                          onCheckedChange={(checked) => {
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
                      <button className="flex aspect-square items-center justify-center rounded p-1 hover:bg-secondary">
                        <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  )
                  )}
                </div>
              </>
            )}
          </div>
        </div>
        )}

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
      </div>
    </AdminLayout>
  );
};

export default DishesListPage;


