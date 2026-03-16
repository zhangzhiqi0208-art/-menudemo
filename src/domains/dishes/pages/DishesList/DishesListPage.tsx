import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminLayout from "@/components/AdminLayout";
import emptyMenuImage from "@/assets/empty-menu.png";
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
} from "lucide-react";
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
import { useMenu, type MenuItem } from "@/contexts/MenuContext";

const DishesListPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { categories, setCategories, categoryItems, setCategoryItems } =
    useMenu();
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [expandedItems, setExpandedItems] = useState<string[]>([]);

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
      setCategoryItems((prev) => {
        const newItems = { ...prev };
        for (const key in newItems) {
          newItems[key] = newItems[key].map((item) =>
            item.id === editingPriceItemId
              ? { ...item, deliveryPrice: `R$${editingPriceValue.trim()}` }
              : item,
          );
        }
        return newItems;
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

  return (
    <AdminLayout>
      <div className="p-6">
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
            <Button variant="outline" className="h-9 gap-2">
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
              {categories.map((cat, idx) => (
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
                    {cat.count}
                  </span>
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
                </div>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-auto">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-base font-semibold">
                {categories[selectedCategory].name}{" "}
                <span className="font-normal text-muted-foreground">
                  {categories[selectedCategory].count}{" "}
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

            <div className="grid grid-cols-[1fr_120px_100px_80px_70px_30px] gap-2 border-b border-border px-2 pb-2 text-xs text-muted-foreground">
              <span>{t("menuList.title")}</span>
              <span className="text-right">{t("menuList.delivery")}</span>
              <span className="text-right">{t("menuList.pickUp")}</span>
              <span className="text-right">{t("menuList.stock")}</span>
              <span className="text-center">{t("menuList.status")}</span>
              <span></span>
            </div>

            {(categoryItems[selectedCategory] || []).length === 0 ? (
              <div className="flex flex-1 flex-col items-center justify-center py-20">
                <img
                  src={emptyMenuImage}
                  alt="Empty menu"
                  className="mb-6 h-32 w-32 object-contain"
                />
                <p className="mb-4 text-base font-semibold text-foreground">
                  {t("menuList.startBuilding")}
                </p>
                <Button
                  onClick={() => navigate("/menu/new")}
                  className="bg-[hsl(50,100%,50%)] text-foreground hover:bg-[hsl(50,100%,45%)] font-medium"
                >
                  <Plus className="h-4 w-4 mr-1" />
                  {t("menuList.addItem")}
                </Button>
              </div>
            ) : (
              <>
                <div className="divide-y divide-border">
                  {(categoryItems[selectedCategory] || []).map((item) => (
                    <div key={item.id}>
                      <div className="grid grid-cols-[1fr_120px_100px_80px_70px_30px] items-center gap-2 px-2 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-secondary text-2xl">
                            {item.image}
                          </div>
                          <div>
                            <p
                              className={`text-sm font-medium cursor-pointer hover:underline ${
                                !item.status
                                  ? "text-muted-foreground/50"
                                  : ""
                              }`}
                              onClick={() =>
                                navigate(`/menu/edit/${item.id}`)
                              }
                            >
                              {item.title}
                            </p>
                            {(item.reviewStatus ||
                              item.marketingActivity ||
                              item.availability ||
                              item.notSoldIndependently) && (
                              <div className="mt-1 flex flex-wrap gap-1.5">
                                {item.reviewStatus === "under_review" && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                                    <Hourglass className="h-3 w-3" />
                                    {t("menuList.underReview")}
                                  </span>
                                )}
                                {item.marketingActivity && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                                    <Megaphone className="h-3 w-3" />
                                    {t("menuList.inMarketingActivities")}
                                  </span>
                                )}
                                {item.availability && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    {item.availability}
                                  </span>
                                )}
                                {item.notSoldIndependently && (
                                  <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-xs text-muted-foreground">
                                    <Lock className="h-3 w-3" />
                                    {t("menuList.cannotSoldIndependently")}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        {editingPriceItemId === item.id ? (
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
                          <span
                            className={`cursor-pointer rounded px-2 py-1 text-right text-sm transition-colors hover:bg-secondary ${
                              !item.status ? "text-muted-foreground/50" : ""
                            }`}
                            onClick={() => startEditPrice(item)}
                          >
                            {item.deliveryPrice}
                          </span>
                        )}
                        <span
                          className={`text-right text-sm ${
                            !item.status ? "text-muted-foreground/50" : ""
                          }`}
                        >
                          {item.pickupPrice}
                        </span>
                        <span
                          className={`text-right text-sm ${
                            !item.status ? "text-muted-foreground/50" : ""
                          }`}
                        >
                          {item.stock}
                        </span>
                        <div
                          className="flex justify-center"
                          style={{ opacity: !item.status ? 2.5 : 1 }}
                        >
                          <Switch
                            checked={item.status}
                            onCheckedChange={(checked) => {
                              setCategoryItems((prev) => ({
                                ...prev,
                                [selectedCategory]: prev[selectedCategory].map(
                                  (i) =>
                                    i.id === item.id
                                      ? { ...i, status: checked }
                                      : i,
                                ),
                              }));
                            }}
                          />
                        </div>
                        <button className="flex aspect-square items-center justify-center rounded p-1 hover:bg-secondary">
                          <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </button>
                      </div>

                      {item.addOns &&
                        item.addOns.length > 0 &&
                        item.addOns.map((group, gi) => (
                          <div
                            key={gi}
                            className="border-t border-border bg-secondary/30"
                          >
                            <div className="grid grid-cols-[1fr_120px_100px_80px_70px_30px] items-center gap-2 px-2 py-2">
                              <span className="pl-4 text-xs font-medium text-muted-foreground">
                                {group.name}{" "}
                                {group.required && (
                                  <span className="text-destructive">
                                    ({t("menuList.required")})
                                  </span>
                                )}
                              </span>
                            </div>
                            {group.items.map((sub, si) => (
                              <div key={si}>
                                <div className="grid grid-cols-[1fr_120px_100px_80px_70px_30px] items-center gap-2 px-2 py-2">
                                  <span className="pl-8 text-sm">
                                    {sub.name}
                                  </span>
                                  <span className="text-right text-sm">
                                    {sub.deliveryPrice}
                                  </span>
                                  <span className="text-right text-sm">
                                    {sub.pickupPrice}
                                  </span>
                                  <span className="text-right text-sm">
                                    {sub.stock}
                                  </span>
                                  <div className="flex justify-center">
                                    <Switch checked={sub.status} />
                                  </div>
                                  <button className="rounded p-1 hover:bg-secondary">
                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                  </button>
                                </div>
                                {sub.warning &&
                                  sub.warning.includes("prohibited") && (
                                    <p className="mb-1 pl-4 text-xs text-destructive">
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
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

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


