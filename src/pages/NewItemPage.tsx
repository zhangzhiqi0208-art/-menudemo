import { useState, useEffect, useRef, useCallback, useMemo, type ChangeEvent } from "react";
import { flushSync } from "react-dom";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminLayout from "@/components/AdminLayout";
import {
  ArrowLeft,
  ImagePlus,
  Plus,
  GripVertical,
  Copy,
  Trash2,
  ChevronUp,
  ChevronDown,
  Link2,
  Pencil,
  Info,
  TrendingUp,
  ThumbsUp,
} from "lucide-react";
import ImageUploadDialog from "@/components/ImageUploadDialog";
import { LinkExistingOptionGroupsDialog } from "@/components/LinkExistingOptionGroupsDialog";
import { LinkExistingDishesDialog, type LinkedDishPick } from "@/components/LinkExistingDishesDialog";
import { PRESET_OPTION_GROUPS, type PresetOptionGroup } from "@/data/presetOptionGroups";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { useMenu, type ComboPortion } from "@/contexts/MenuContext";
import { displayCategoryName } from "@/i18n/builtinDisplay";
import { toast } from "@/hooks/use-toast";
import {
  buildMenuItemPayload,
  mapAddOnsToModifierGroups,
  mapMenuItemToFormDraft,
  stripCurrencyPrefix,
  stripOptionGroupNameSuffix,
} from "@/domains/dishes/model/menuItemMappers";
import { cn } from "@/lib/utils";
import { scrollFieldIntoViewInAdminMain } from "@/lib/scrollFieldIntoView";
import { useVersion } from "@/app/providers/VersionProvider";

const COMBO_PORTION_OPTIONS: { id: ComboPortion; labelKey: string; rangeKey: string }[] = [
  { id: "single", labelKey: "newItem.comboPortionSingle", rangeKey: "newItem.comboPortionRange1" },
  { id: "double", labelKey: "newItem.comboPortionDouble", rangeKey: "newItem.comboPortionRange2" },
  { id: "large", labelKey: "newItem.comboPortionLarge", rangeKey: "newItem.comboPortionRange34" },
  { id: "xlarge", labelKey: "newItem.comboPortionXlarge", rangeKey: "newItem.comboPortionRange58" },
  { id: "other", labelKey: "newItem.comboPortionOther", rangeKey: "newItem.comboPortionRange8plus" },
];

const parseLocaleNumber = (s: string): number => {
  const t = s.replace(",", ".").trim();
  if (t === "") return NaN;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : NaN;
};

/** 套餐原价/折后价等金额：去掉 R$ 再解析，避免沿用列表里的 R$ 前缀导致计算静默失败 */
const parseMoneyAmount = (s: string): number => parseLocaleNumber(stripCurrencyPrefix(s));

const formatMoneyForCombo = (n: number): string => {
  if (!Number.isFinite(n) || n < 0) return "";
  return (Math.round(n * 100) / 100).toFixed(2);
};

/** SSL「添加菜品」单菜卡片：份数>1 时展示（单价 * N）总价 */
const formatSslAddDishesDeliveryDisplay = (
  unitPriceRaw: string | undefined,
  cardQty: number,
  breakdownT: (k: string, o?: Record<string, string | number>) => string,
): string => {
  const unit = (unitPriceRaw ?? "").trim();
  if (!unit) return "";
  if (cardQty <= 1) return unit;
  const n = parseMoneyAmount(unit);
  if (!Number.isFinite(n) || n < 0) return unit;
  const totalStr = `R$${formatMoneyForCombo(n * cardQty)}`;
  return breakdownT("newItem.sslComboDeliveryBreakdown", {
    unit,
    qty: cardQty,
    total: totalStr,
  });
};

/** 将「添加菜品」下各卡片子项配送价（R$）加总；每组乘以稿面份数 cardQuantity */
const sumModifierGroupItemsDeliveryPrices = (
  groups: { items: { price: string }[]; cardQuantity?: string }[],
): number => {
  let t = 0;
  for (const g of groups) {
    let line = 0;
    for (const it of g.items) {
      const n = parseMoneyAmount(it.price);
      if (Number.isFinite(n) && n > 0) line += n;
    }
    const qty = Math.max(1, parseInt(g.cardQuantity ?? "1", 10) || 1);
    t += line * qty;
  }
  return t;
};

/** 由原价与折后价反推折扣率（0–100）后的展示字符串 */
const formatDiscountPercentFromRatio = (d: number): string => {
  const r = Math.round(d * 100) / 100;
  const rounded = Math.round(r);
  if (Math.abs(r - rounded) < 1e-6) return String(rounded);
  return String(r);
};

const COMBO_DISCOUNT_PRESETS = [
  { percent: 15, titleKey: "newItem.comboPreset85Title", descKey: "newItem.comboPreset85Desc", recommended: false },
  { percent: 20, titleKey: "newItem.comboPreset80Title", descKey: "newItem.comboPreset80Desc", recommended: true },
  { percent: 30, titleKey: "newItem.comboPreset70Title", descKey: "newItem.comboPreset70Desc", recommended: false },
] as const;

/** SSL 已保存选项组卡片标题（单菜展示菜名；多菜展示「组名 - 可选/必选 区间」） */
const sslComboSavedCardTitle = (
  group: { name: string; min: string; max: string; required: boolean; items: { name: string }[] },
  t: (k: string, o?: Record<string, string | number>) => string,
) => {
  const rangeLabel = group.required
    ? t("newItem.sslComboCardRangeRequired", { min: group.min, max: group.max })
    : t("newItem.sslComboCardRangeOptional", { min: group.min, max: group.max });
  if (group.items.length === 1) {
    return group.items[0].name;
  }
  const stripped = stripOptionGroupNameSuffix(group.name).trim();
  if (stripped) {
    return `${stripped} - ${rangeLabel}`;
  }
  return `${t("newItem.newModifier")} - ${rangeLabel}`;
};

type SuffixInputProps = {
  value: string;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
  suffix: string;
  invalid?: boolean;
  disabled?: boolean;
};

/** 与系统 Input 一致的描边，右侧后缀区与输入框竖线分隔 */
const SuffixInput = ({ value, onChange, placeholder, suffix, invalid, disabled }: SuffixInputProps) => (
  <div
    className={cn(
      "flex min-h-10 overflow-hidden rounded-md border border-[#BABABF] bg-transparent transition-colors focus-within:border-black",
      invalid && "border-destructive focus-within:border-destructive",
      disabled && "cursor-not-allowed bg-[#F2F2F5] opacity-90",
    )}
  >
    <Input
      value={value}
      onChange={onChange}
      disabled={disabled}
      placeholder={placeholder}
      inputMode="decimal"
      className="h-10 min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-base shadow-none placeholder:text-[#BABABF] focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none md:text-sm disabled:cursor-not-allowed disabled:opacity-100"
    />
    <div className="flex shrink-0 items-center border-l border-[#BABABF] bg-[#F2F2F5] px-3 text-sm font-medium text-muted-foreground">
      {suffix}
    </div>
  </div>
);

/** 子项「范围最大」：仅保留大于 1 的整数，否则视为无限制 */
const normalizeSubItemRangeMax = (raw: string): string => {
  const v = raw.trim();
  if (!v) return "";
  const n = parseInt(v, 10);
  if (Number.isNaN(n) || n <= 1) return "";
  return String(n);
};

const maxQtyToRangeMaxInput = (maxQty: string): string => {
  if (!maxQty || maxQty === "unlimited" || maxQty === "-") return "";
  const n = parseInt(maxQty, 10);
  if (Number.isNaN(n) || n <= 1) return "";
  return String(n);
};

interface SubItemRowProps {
  item: { name: string; price: string; maxQty: string };
  idx: number;
  groupId: string;
  totalItems: number;
  onUpdate: (field: "name" | "price" | "maxQty", value: string) => void;
  onDelete: () => void;
  onEdit: () => void;
  onDragStart: () => void;
  onDragOver: (e: any) => void;
  onDragEnd: () => void;
}

const SubItemRow = ({
  item,
  totalItems,
  onUpdate,
  onDelete,
  onEdit,
  onDragStart,
  onDragOver,
  onDragEnd,
}: SubItemRowProps) => {
  const [hovered, setHovered] = useState(false);
  const [editingField, setEditingField] = useState<"name" | "price" | "maxQty" | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (field: "name" | "price" | "maxQty") => {
    setEditingField(field);
    if (field === "price") {
      setEditValue(item.price.replace("R$", ""));
    } else if (field === "maxQty") {
      setEditValue(item.maxQty === "unlimited" || item.maxQty === "-" ? "" : item.maxQty);
    } else {
      setEditValue(item.name);
    }
  };

  const commitEdit = () => {
    if (!editingField) return;
    if (editingField === "name" && editValue.trim()) {
      onUpdate("name", editValue.trim());
    } else if (editingField === "price") {
      onUpdate("price", editValue ? `R$${editValue}` : item.price);
    } else if (editingField === "maxQty") {
      const val = editValue.trim();
      onUpdate("maxQty", !val || val === "0" ? "unlimited" : val);
    }
    setEditingField(null);
  };

  const handleKeyDown = (e: any) => {
    if (e.key === "Enter") commitEdit();
    if (e.key === "Escape") setEditingField(null);
  };

  return (
    <div
      className="grid grid-cols-[24px_1fr_100px_100px_60px] gap-2 items-center px-4 py-2 border-t border-border text-sm"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      draggable
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <GripVertical
        className={`h-4 w-4 cursor-grab ${
          totalItems <= 1 ? "text-muted-foreground/30" : "text-muted-foreground"
        }`}
      />

      {/* Name */}
      {editingField === "name" ? (
        <Input
          autoFocus
          className="h-7 text-sm"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={commitEdit}
          onKeyDown={handleKeyDown}
        />
      ) : (
        <span
          className="cursor-pointer truncate rounded px-1.5 py-0.5 transition-colors hover:bg-[#F2F2F5]"
          onClick={() => startEdit("name")}
        >
          {item.name}
        </span>
      )}

      {/* Price */}
      {editingField === "price" ? (
        <div className="relative">
          <Input
            autoFocus
            className="h-7 text-sm pr-8"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
          />
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
            R$
          </span>
        </div>
      ) : (
        <span
          className="text-center cursor-pointer rounded px-1.5 py-0.5 transition-colors hover:bg-[#F2F2F5]"
          onClick={() => startEdit("price")}
        >
          {item.price}
        </span>
      )}

      {/* Max QTY */}
      {editingField === "maxQty" ? (
        <div>
          <Input
            autoFocus
            className="h-7 text-sm"
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={handleKeyDown}
          />
        </div>
      ) : (
        <span
          className="text-center cursor-pointer rounded px-1.5 py-0.5 transition-colors hover:bg-[#F2F2F5]"
          onClick={() => startEdit("maxQty")}
        >
          {item.maxQty}
        </span>
      )}

      {/* Actions - visible on hover */}
      <div
        className={`flex items-center gap-1 justify-end transition-opacity ${
          hovered ? "opacity-100" : "opacity-0"
        }`}
      >
        <button onClick={onEdit} className="rounded p-1 hover:bg-[#F2F2F5]">
          <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
        <button onClick={onDelete} className="rounded p-1 hover:bg-[#F2F2F5]">
          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
        </button>
      </div>
    </div>
  );
};

const NewItemPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { itemId } = useParams<{ itemId?: string }>();
  const { categories, addItem, updateItem, moveItemToCategory, getItemById } = useMenu();

  const isEdit = !!itemId;
  const existingData = isEdit ? getItemById(itemId) : null;
  /** 已保存菜品再次编辑时不允许改类型（单品/套餐） */
  const itemTypeLocked = isEdit && existingData !== null;
  const { version } = useVersion();

  const fromCategory = (location.state as { fromCategory?: number })?.fromCategory;
  const initialCategory =
    typeof fromCategory === "number" && fromCategory >= 0 ? String(fromCategory) : "";

  const [itemType, setItemType] = useState<"items" | "combo">("items");
  /** SSL 套餐（新建与编辑）：与新建页一致的套餐模式、添加菜品/选项组稿面等 */
  const sslComboForm = version === "ssl" && itemType === "combo";
  /** SSL 套餐：套餐模式（选项组 / 添加菜品），默认添加菜品 */
  const [sslComboMode, setSslComboMode] = useState<"add_option_group" | "add_dishes">("add_dishes");
  /** SSL + 「添加菜品」：设定原价由已添加菜品配送价加总且不可编辑 */
  const sslComboAutoOriginalFromDishes = sslComboForm && sslComboMode === "add_dishes";
  /** BR 套餐：折扣为空时不自动把折后价填成原价；用户输入折扣后按公式联动折后价 */
  const brComboManualDiscountedPrice = version === "br" && itemType === "combo";
  /** BR：选项组「添加选项组」及卡片内/下拉中的文字操作按钮与图标 */
  const brOptionGroupActionClass = version === "br" ? "text-[#FF8C19]" : "text-primary";
  const [comboPortion, setComboPortion] = useState<ComboPortion>("single");
  const [comboOriginalPrice, setComboOriginalPrice] = useState("");
  const [comboDiscountPercent, setComboDiscountPercent] = useState("");
  const [discountPresetPanelOpen, setDiscountPresetPanelOpen] = useState(false);
  const discountComboFieldRef = useRef<HTMLDivElement>(null);
  const [itemName, setItemName] = useState("");
  const [pdvCode, setPdvCode] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState<string>(initialCategory);
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [deliveryPrice, setDeliveryPrice] = useState("");
  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [pickupPrice, setPickupPrice] = useState("");
  const [didiEnabled, setDidiEnabled] = useState(false);
  const [stockType, setStockType] = useState("unlimited");
  const [stockCount, setStockCount] = useState("");
  const [canSoldSeparately, setCanSoldSeparately] = useState("yes");
  const [containsAlcohol, setContainsAlcohol] = useState("no");
  const [saleTimeType, setSaleTimeType] = useState("allDay");
  const [submitted, setSubmitted] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  useEffect(() => {
    if (existingData) {
      const { item, categoryIndex } = existingData;
      const draft = mapMenuItemToFormDraft(item, categoryIndex);
      setItemType(draft.itemType);
      setComboPortion(draft.comboPortion);
      setComboOriginalPrice(draft.comboOriginalPrice);
      setComboDiscountPercent(draft.comboDiscountPercent);
      setItemName(draft.itemName);
      setPdvCode(draft.pdvCode);
      setDescription(draft.description);
      setSelectedCategoryIdx(draft.selectedCategoryIdx);
      setDeliveryEnabled(true);
      setDeliveryPrice(draft.deliveryPrice);
      setPickupPrice(draft.pickupPrice);
      setPickupEnabled(draft.pickupEnabled);
      setStockType(draft.stockType);
      setStockCount(draft.stockCount);
      setCanSoldSeparately(draft.canSoldSeparately);
      const loadedGroups = mapAddOnsToModifierGroups(item.addOns);
      setModifierGroups(loadedGroups);
      if (version === "ssl" && draft.itemType === "combo") {
        const inferredMode =
          loadedGroups.length > 0 && loadedGroups.some((g) => g.items.length !== 1)
            ? "add_option_group"
            : "add_dishes";
        setSslComboMode(inferredMode);
      }
      const isImageUrl = typeof item.image === "string" && (/^(https?|blob|data):/.test(item.image) || (item.image.includes("/") && item.image.length > 4));
      setUploadedImage(isImageUrl ? item.image : null);
    } else {
      setComboPortion("single");
      setComboOriginalPrice("");
      setComboDiscountPercent("");
      setModifierGroups([]);
      setSslComboMode("add_dishes");
      setUploadedImage(null);
    }
  }, [itemId, version]);

  const prevSslComboModeRef = useRef(sslComboMode);
  /** SSL：从「添加菜品」切到「添加选项组」时，若仅有简化配送价，带入 BR 定价表单（原价 + 0% 折扣） */
  useEffect(() => {
    const prev = prevSslComboModeRef.current;
    prevSslComboModeRef.current = sslComboMode;
    const enteredOptionGroup =
      sslComboForm && sslComboMode === "add_option_group" && prev === "add_dishes";
    if (!enteredOptionGroup) return;
    if (comboOriginalPrice.trim()) return;
    const d = deliveryPrice.trim();
    if (!d) return;
    setComboOriginalPrice(d);
    setComboDiscountPercent("0");
  }, [sslComboForm, sslComboMode, comboOriginalPrice, deliveryPrice]);

  const [deleteGroupId, setDeleteGroupId] = useState<string | null>(null);
  const [dragItem, setDragItem] = useState<{ groupId: string; idx: number } | null>(null);
  const [linkExistingGroupsDialogOpen, setLinkExistingGroupsDialogOpen] = useState(false);

  interface ModifierGroupItem {
    name: string;
    price: string;
    maxQty: string;
  }

  interface ModifierGroup {
    id: string;
    name: string;
    customId: string;
    min: string;
    max: string;
    allowMultiple: boolean;
    required: boolean;
    collapsed: boolean;
    items: ModifierGroupItem[];
    status: "unsaved" | "error" | "saved";
    /** SSL 稿面：已保存卡片头部的份数，不影响保存状态 */
    cardQuantity?: string;
  }

  const [modifierGroups, setModifierGroups] = useState<ModifierGroup[]>([]);
  const [linkExistingDishesOpen, setLinkExistingDishesOpen] = useState(false);
  const [linkExistingDishesGroupId, setLinkExistingDishesGroupId] = useState<string | null>(null);
  /** append：向已有选项组追加；sslNewGroup：SSL「添加菜品」确认后新建一组并写入子项 */
  const [linkExistingDishesMode, setLinkExistingDishesMode] = useState<"append" | "sslNewGroup" | null>(
    null,
  );

  const linkExistingDishesExistingNamesLower = useMemo(() => {
    if (linkExistingDishesMode === "sslNewGroup") {
      const s = new Set<string>();
      for (const g of modifierGroups) {
        for (const i of g.items) {
          const n = i.name.trim().toLowerCase();
          if (n) s.add(n);
        }
      }
      return s;
    }
    if (linkExistingDishesMode === "append" && linkExistingDishesGroupId) {
      const g = modifierGroups.find((x) => x.id === linkExistingDishesGroupId);
      return new Set((g?.items ?? []).map((i) => i.name.trim().toLowerCase()).filter(Boolean));
    }
    return new Set<string>();
  }, [linkExistingDishesMode, linkExistingDishesGroupId, modifierGroups]);

  const handleLinkExistingDishesConfirm = useCallback(
    (picks: LinkedDishPick[]) => {
      if (picks.length === 0) return;

      setModifierGroups((prev) => {
        if (linkExistingDishesMode === "sslNewGroup") {
          const base = Date.now();
          /** SSL「添加菜品」：每选一道菜生成一张独立卡片（单菜一组），无需再点保存 */
          return [
            ...prev,
            ...picks.map((p, i) => ({
              id: `mg-${base}-${i}`,
              name: p.name,
              customId: "",
              min: "1",
              max: "1",
              allowMultiple: false,
              required: false,
              collapsed: false,
              cardQuantity: "1",
              items: [
                {
                  name: p.name,
                  price: p.price,
                  maxQty: "unlimited" as const,
                },
              ],
              status: "saved" as const,
            })),
          ];
        }
        const gid = linkExistingDishesGroupId;
        if (!gid) return prev;
        return prev.map((g) =>
          g.id === gid
            ? {
                ...g,
                items: [
                  ...g.items,
                  ...picks.map((p) => ({
                    name: p.name,
                    price: p.price,
                    maxQty: "unlimited" as const,
                  })),
                ],
                status: "unsaved" as const,
              }
            : g,
        );
      });
    },
    [linkExistingDishesMode, linkExistingDishesGroupId],
  );

  const openSslAddDishesPicker = useCallback(() => {
    setLinkExistingDishesMode("sslNewGroup");
    setLinkExistingDishesGroupId(null);
    setLinkExistingDishesOpen(true);
  }, []);

  const addNewModifierGroup = () => {
    setModifierGroups((prev) => [
      ...prev,
      {
        id: `mg-${Date.now()}`,
        name: "",
        customId: "",
        min: "1",
        max: "1",
        allowMultiple: false,
        required: false,
        collapsed: false,
        cardQuantity: "1",
        items: [],
        status: "unsaved" as const,
      },
    ]);
  };

  const removeModifierGroup = (id: string) => {
    setModifierGroups((prev) => prev.filter((g) => g.id !== id));
  };

  const toggleModifierCollapse = (id: string) => {
    setModifierGroups((prev) => prev.map((g) => (g.id === id ? { ...g, collapsed: !g.collapsed } : g)));
  };

  const updateModifierGroup = (id: string, updates: Partial<ModifierGroup>) => {
    setModifierGroups((prev) =>
      prev.map((g) =>
        g.id === id
          ? {
              ...g,
              ...updates,
              ...(updates.status ? {} : { status: "unsaved" as const }),
            }
          : g,
      ),
    );
  };

  const saveModifierGroup = (id: string) => {
    setModifierGroups((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        if (!g.name.trim()) return { ...g, status: "error" as const };
        if (g.items.length === 0) return { ...g, status: "error" as const };
        return { ...g, status: "saved" as const };
      }),
    );
  };

  /** 稿面份数仅影响展示与原价汇总，不改变「已保存」态，避免卡片退化为完整选项组形态 */
  const bumpSslSavedCardQuantity = useCallback((id: string, delta: number) => {
    setModifierGroups((prev) =>
      prev.map((g) => {
        if (g.id !== id) return g;
        const cur = Math.max(1, parseInt(g.cardQuantity ?? "1", 10) || 1);
        const next = Math.max(1, cur + delta);
        return { ...g, cardQuantity: String(next) };
      }),
    );
  }, []);

  const setSslSavedCardQuantityInput = useCallback((id: string, raw: string) => {
    const digits = raw.replace(/\D/g, "");
    const n = digits ? parseInt(digits, 10) : NaN;
    const v = Number.isFinite(n) && n > 0 ? n : 1;
    setModifierGroups((prev) =>
      prev.map((g) => (g.id === id ? { ...g, cardQuantity: String(v) } : g)),
    );
  }, []);

  const handleLinkExistingGroupsConfirm = (selected: PresetOptionGroup[]) => {
    if (selected.length === 0) return;
    const base = Date.now();
    const toFormPrice = (raw: string) => {
      const v = raw.replace(/^R\$\s?/i, "").trim();
      if (!v) return "R$0.00";
      return `R$${v}`;
    };
    setModifierGroups((prev) => [
      ...prev,
      ...selected.map((preset, i) => ({
        id: `mg-${base}-${i}-${preset.id}`,
        name: preset.title,
        customId: "",
        min: String(preset.min),
        max: String(preset.max),
        allowMultiple: false,
        required: preset.min > 0 && preset.min === preset.max,
        collapsed: false,
        cardQuantity: "1",
        items: preset.modifiers.map((m) => ({
          name: m.name,
          price: toFormPrice(m.price),
          maxQty: "unlimited" as const,
        })),
        status: "saved" as const,
      })),
    ]);
  };

  const getMinValue = (min: string) => parseInt(min) || 0;
  const getMaxValue = (max: string) => parseInt(max) || 0;
  const isRequiredDisabled = (min: string, max: string) => {
    const minVal = getMinValue(min);
    const maxVal = getMaxValue(max);
    return minVal !== maxVal; // disabled when min !== max
  };
  const isRequiredForced = (min: string) => getMinValue(min) > 0;

  // New modifier dialog state
  const [newModifierDialogOpen, setNewModifierDialogOpen] = useState(false);
  const [newModifierTargetGroupId, setNewModifierTargetGroupId] = useState<string>("");
  const [newModifierEditIdx, setNewModifierEditIdx] = useState<number | null>(null); // null = create, number = edit index
  const [newModifierName, setNewModifierName] = useState("");
  const [newModifierCategory, setNewModifierCategory] = useState("");
  const [newModifierDeliveryPrice, setNewModifierDeliveryPrice] = useState("");
  const [newModifierStockType, setNewModifierStockType] = useState("unlimited");
  const [newModifierStockCount, setNewModifierStockCount] = useState("");
  const [newModifierMaxLimit, setNewModifierMaxLimit] = useState("");
  const [rangeMaxFieldFocused, setRangeMaxFieldFocused] = useState(false);
  const [newModifierCanSoldSeparately, setNewModifierCanSoldSeparately] = useState("yes");

  const openNewModifierDialog = (groupId: string) => {
    setNewModifierTargetGroupId(groupId);
    setNewModifierEditIdx(null);
    setNewModifierName("");
    setNewModifierCategory("");
    setNewModifierDeliveryPrice("");
    setNewModifierStockType("unlimited");
    setNewModifierStockCount("");
    setNewModifierMaxLimit("");
    setRangeMaxFieldFocused(false);
    setNewModifierCanSoldSeparately("yes");
    setNewModifierDialogOpen(true);
  };

  const openEditModifierDialog = (groupId: string, idx: number) => {
    const group = modifierGroups.find((g) => g.id === groupId);
    if (!group) return;
    const item = group.items[idx];
    setNewModifierTargetGroupId(groupId);
    setNewModifierEditIdx(idx);
    setNewModifierName(item.name);
    setNewModifierCategory("");
    setNewModifierDeliveryPrice(item.price.replace("R$", ""));
    setNewModifierStockType(item.maxQty === "unlimited" || item.maxQty === "-" ? "unlimited" : "custom");
    setNewModifierStockCount(item.maxQty === "unlimited" || item.maxQty === "-" ? "" : item.maxQty);
    setNewModifierMaxLimit(maxQtyToRangeMaxInput(item.maxQty));
    setRangeMaxFieldFocused(false);
    setNewModifierCanSoldSeparately("yes");
    setNewModifierDialogOpen(true);
  };

  const handleNewModifierSubmit = () => {
    if (!newModifierName.trim()) return;
    const rangeNorm = normalizeSubItemRangeMax(newModifierMaxLimit);
    const modItem: ModifierGroupItem = {
      name: newModifierName.trim(),
      price: newModifierDeliveryPrice ? `R$${newModifierDeliveryPrice}` : "R$0.00",
      maxQty: rangeNorm === "" ? "unlimited" : rangeNorm,
    };

    if (newModifierEditIdx !== null) {
      // Edit existing
      setModifierGroups((prev) =>
        prev.map((g) => {
          if (g.id !== newModifierTargetGroupId) return g;
          const newItems = [...g.items];
          newItems[newModifierEditIdx] = modItem;
          return { ...g, items: newItems, status: "unsaved" as const };
        }),
      );
    } else {
      // Create new
      setModifierGroups((prev) =>
        prev.map((g) =>
          g.id === newModifierTargetGroupId
            ? { ...g, items: [...g.items, modItem], status: "unsaved" as const }
            : g,
        ),
      );
    }

    setNewModifierDialogOpen(false);
  };

  /** SSL 套餐：切换「添加选项组 / 添加菜品」时清空该字段下方的修改项与销售信息（保留基本信息区的名称、分类、图片等）。 */
  const clearSslNewComboFormBelowComboMode = useCallback(() => {
    setModifierGroups([]);
    setComboOriginalPrice("");
    setComboDiscountPercent("");
    setDeliveryPrice("");
    setDiscountPresetPanelOpen(false);
    setLinkExistingGroupsDialogOpen(false);
    setLinkExistingDishesOpen(false);
    setLinkExistingDishesGroupId(null);
    setLinkExistingDishesMode(null);
    setDeleteGroupId(null);
    setDragItem(null);
    setNewModifierDialogOpen(false);
    setNewModifierTargetGroupId("");
    setNewModifierEditIdx(null);
    setNewModifierName("");
    setNewModifierCategory("");
    setNewModifierDeliveryPrice("");
    setNewModifierStockType("unlimited");
    setNewModifierStockCount("");
    setNewModifierMaxLimit("");
    setRangeMaxFieldFocused(false);
    setNewModifierCanSoldSeparately("yes");
    setSubmitted(false);
    setPickupEnabled(false);
    setPickupPrice("");
    setCanSoldSeparately("yes");
    setSaleTimeType("allDay");
  }, []);

  /** 新建页切换单品/套餐：仅保留名称、门店分类、图片，其余恢复默认 */
  const resetFormExceptNameCategoryImage = useCallback(() => {
    setPdvCode("");
    setDescription("");
    setComboPortion("single");
    setComboOriginalPrice("");
    setComboDiscountPercent("");
    setDiscountPresetPanelOpen(false);
    setDeliveryEnabled(true);
    setDeliveryPrice("");
    setPickupEnabled(false);
    setPickupPrice("");
    setDidiEnabled(false);
    setStockType("unlimited");
    setStockCount("");
    setCanSoldSeparately("yes");
    setContainsAlcohol("no");
    setSaleTimeType("allDay");
    setSubmitted(false);
    setImageDialogOpen(false);
    setModifierGroups([]);
    setSslComboMode("add_dishes");
    setDeleteGroupId(null);
    setDragItem(null);
    setLinkExistingGroupsDialogOpen(false);
    setLinkExistingDishesOpen(false);
    setLinkExistingDishesGroupId(null);
    setLinkExistingDishesMode(null);
    setNewModifierDialogOpen(false);
    setNewModifierTargetGroupId("");
    setNewModifierEditIdx(null);
    setNewModifierName("");
    setNewModifierCategory("");
    setNewModifierDeliveryPrice("");
    setNewModifierStockType("unlimited");
    setNewModifierStockCount("");
    setNewModifierMaxLimit("");
    setRangeMaxFieldFocused(false);
    setNewModifierCanSoldSeparately("yes");
  }, []);

  const handleItemTypeChange = useCallback(
    (next: "items" | "combo") => {
      if (itemTypeLocked || next === itemType) return;
      setItemType(next);
      resetFormExceptNameCategoryImage();
    },
    [itemType, itemTypeLocked, resetFormExceptNameCategoryImage],
  );

  /** 由原价 + 折扣（减免 %，0–100）计算折后价：售价 = 原价 × (1 − d/100)。BR / SSL 添加菜品：折扣为空时不自动改写折后价。 */
  const recalcComboDeliveryFromOriginalAndDiscount = (orig: string, disc: string) => {
    const o = parseMoneyAmount(orig);
    const dRaw = disc.trim();
    const d = parseLocaleNumber(disc);
    if (!Number.isFinite(o) || o < 0) return;
    if (dRaw === "") {
      if (!sslComboAutoOriginalFromDishes && !brComboManualDiscountedPrice) {
        setDeliveryPrice(formatMoneyForCombo(o));
      }
      return;
    }
    if (!Number.isFinite(d) || d < 0 || d > 100) return;
    setDeliveryPrice(formatMoneyForCombo(o * (1 - d / 100)));
  };

  const onComboOriginalChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setComboOriginalPrice(v);
    recalcComboDeliveryFromOriginalAndDiscount(v, comboDiscountPercent);
  };

  const onComboDiscountChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setComboDiscountPercent(v);
    recalcComboDeliveryFromOriginalAndDiscount(comboOriginalPrice, v);
  };

  const onComboDiscountedChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setDeliveryPrice(v);
    const trimmed = v.trim();
    if (!trimmed) {
      setComboDiscountPercent("");
      return;
    }
    const o = parseMoneyAmount(comboOriginalPrice);
    const p = parseMoneyAmount(trimmed);
    if (!Number.isFinite(o) || o <= 0 || !Number.isFinite(p) || p < 0) return;
    if (p > o + 1e-9) {
      setComboDiscountPercent("");
      return;
    }
    const d = (1 - p / o) * 100;
    if (d < 0 || d > 100) return;
    setComboDiscountPercent(formatDiscountPercentFromRatio(d));
  };

  useEffect(() => {
    if (!sslComboAutoOriginalFromDishes) return;
    const dishLineCount = modifierGroups.reduce((n, g) => n + g.items.length, 0);
    /** 尚未添加任何子菜品时不覆盖原价（避免打断「单品→套餐」带入的设定原价） */
    if (dishLineCount === 0) return;
    const sum = sumModifierGroupItemsDeliveryPrices(modifierGroups);
    const next = sum > 0 ? formatMoneyForCombo(sum) : "";
    setComboOriginalPrice(next);
    if (!next.trim()) {
      setDeliveryPrice("");
      setComboDiscountPercent("");
    }
    /** 添加菜品：仅联动设定原价，折后价由用户填写，不因汇总/折扣自动填充 */
  }, [modifierGroups, sslComboAutoOriginalFromDishes]);

  const sslAddDishesPrevLineCountRef = useRef(0);
  useEffect(() => {
    if (!sslComboAutoOriginalFromDishes) {
      sslAddDishesPrevLineCountRef.current = 0;
      return;
    }
    const dishLineCount = modifierGroups.reduce((n, g) => n + g.items.length, 0);
    const prev = sslAddDishesPrevLineCountRef.current;
    sslAddDishesPrevLineCountRef.current = dishLineCount;
    /** 曾添加过菜品又全部删掉时，清空定价（避免沿用已删除菜品的加总） */
    if (dishLineCount === 0 && prev > 0) {
      setComboOriginalPrice("");
      setComboDiscountPercent("");
      setDeliveryPrice("");
    }
  }, [modifierGroups, sslComboAutoOriginalFromDishes]);

  /** 套餐（BR / SSL）：折后价（配送侧）不得高于设定原价 */
  const comboDiscountedExceedsOriginal = useMemo(() => {
    if (itemType !== "combo") return false;
    const dt = deliveryPrice.trim();
    const ot = comboOriginalPrice.trim();
    if (!dt || !ot) return false;
    const o = parseMoneyAmount(ot);
    const p = parseMoneyAmount(dt);
    if (!Number.isFinite(o) || o <= 0 || !Number.isFinite(p)) return false;
    return p > o + 1e-9;
  }, [itemType, comboOriginalPrice, deliveryPrice]);

  /** 折后价高于原价时清空折扣展示（与校验一致，BR/SSL 通用） */
  useEffect(() => {
    if (!comboDiscountedExceedsOriginal) return;
    setComboDiscountPercent("");
  }, [comboDiscountedExceedsOriginal]);

  /** 套餐：折后价为空时折扣一并清空 */
  useEffect(() => {
    if (itemType !== "combo") return;
    if (deliveryPrice.trim() !== "") return;
    setComboDiscountPercent("");
  }, [itemType, deliveryPrice]);

  const itemNameFieldRef = useRef<HTMLDivElement>(null);
  const categoryFieldRef = useRef<HTMLDivElement>(null);
  const deliveryPriceFieldRef = useRef<HTMLDivElement>(null);

  const handleSubmit = () => {
    const nameInvalid = !itemName.trim();
    const categoryInvalid = !selectedCategoryIdx;
    const deliveryInvalid = !deliveryPrice.trim() || comboDiscountedExceedsOriginal;
    const modifiersInvalid = modifierGroups.some((g) => g.status !== "saved");

    flushSync(() => {
      setSubmitted(true);
      if (modifiersInvalid) {
        setModifierGroups((prev) =>
          prev.map((g) =>
            g.status === "saved" ? g : { ...g, status: "error" as const, collapsed: false },
          ),
        );
      }
    });

    if (nameInvalid || categoryInvalid || modifiersInvalid || deliveryInvalid) {
      const scrollTarget = nameInvalid
        ? itemNameFieldRef.current
        : categoryInvalid
          ? categoryFieldRef.current
          : modifiersInvalid
            ? modificationsRef.current
            : deliveryPriceFieldRef.current;

      const tab: "basic" | "modifications" | "sales" =
        nameInvalid || categoryInvalid ? "basic" : modifiersInvalid ? "modifications" : "sales";

      flushSync(() => setActiveTab(tab));
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollFieldIntoViewInAdminMain(scrollTarget));
      });
      return;
    }

    const catIdx = Number(selectedCategoryIdx);
    const existingAddOns = isEdit && existingData ? existingData.item.addOns : undefined;
    // Convert modifier groups to AddOnGroup format, preserving sub-item status when editing
    const addOns = modifierGroups
      .filter((g) => g.status === "saved")
      .map((g) => {
        const existingGroup = existingAddOns?.find(
          (eg) => stripOptionGroupNameSuffix(eg.name) === stripOptionGroupNameSuffix(g.name),
        );
        return {
          name: stripOptionGroupNameSuffix(g.name),
          required: g.required,
          min: g.min,
          max: g.max,
          items: g.items.map((modItem) => {
            const existingSub = existingGroup?.items.find((es) => es.name === modItem.name);
            const existingStatus = existingSub?.status ?? true;
            return {
              name: modItem.name,
              deliveryPrice: modItem.price,
              pickupPrice: modItem.price,
              stock: modItem.maxQty === "unlimited" ? "999" : modItem.maxQty,
              status: existingStatus,
            };
          }),
        };
      });

    const payload = buildMenuItemPayload({
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
    });

    // Use uploaded image or fallback emoji
    const imageValue = uploadedImage || (itemType === "combo" ? "🍱" : "🍽️");
    payload.image = imageValue;
    payload.addOns = addOns;

    if (isEdit && existingData) {
      if (existingData.categoryIndex !== catIdx) {
        moveItemToCategory(itemId, catIdx, payload);
      } else {
        updateItem(itemId, payload);
      }
      toast({ title: t("newItem.itemUpdated") });
    } else {
      const newId = `${catIdx}-${Date.now()}`;
      addItem(catIdx, {
        id: newId,
        ...payload,
      });
      toast({ title: t("newItem.itemCreated") });
    }
    navigate("/", { state: { selectCategory: catIdx } });
  };

  const [activeTab, setActiveTab] = useState<"basic" | "modifications" | "sales">("basic");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const basicInfoRef = useRef<HTMLDivElement>(null);
  const modificationsRef = useRef<HTMLDivElement>(null);
  const salesInfoRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const scrollToSection = (section: "basic" | "modifications" | "sales") => {
    setActiveTab(section);
    isScrollingRef.current = true;
    const refMap = { basic: basicInfoRef, modifications: modificationsRef, sales: salesInfoRef };
    const target = refMap[section].current;
    const container = scrollContainerRef.current?.closest("main");
    if (target && container) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset = targetRect.top - containerRect.top + container.scrollTop - 110;
      container.scrollTo({ top: offset, behavior: "smooth" });
      setTimeout(() => { isScrollingRef.current = false; }, 600);
    } else {
      isScrollingRef.current = false;
    }
  };

  const handleScroll = useCallback(() => {
    if (isScrollingRef.current) return;
    const container = scrollContainerRef.current?.closest("main");
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const threshold = containerRect.top + 120;
    const salesTop = salesInfoRef.current?.getBoundingClientRect().top ?? Infinity;
    const modsTop = modificationsRef.current?.getBoundingClientRect().top ?? Infinity;
    if (salesTop <= threshold) setActiveTab("sales");
    else if (modsTop <= threshold) setActiveTab("modifications");
    else setActiveTab("basic");
  }, []);

  useEffect(() => {
    const container = scrollContainerRef.current?.closest("main");
    if (!container) return;
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [handleScroll]);

  const subItemRangeMaxReadonlyUnlimited = !rangeMaxFieldFocused && newModifierMaxLimit === "";

  return (
    <AdminLayout>
      <div className="min-h-full bg-white">
      {/* Sticky header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border">
        <div className="px-6 pt-4 pb-0">
          <div className="mb-[24px] flex items-center gap-3">
            <button onClick={() => navigate("/")} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />{t("newItem.back")}
            </button>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm font-medium">{isEdit ? t("newItem.editItem") : t("newItem.newItem")}</span>
          </div>
          <div className="flex gap-6">
            <button onClick={() => scrollToSection("basic")} className={`pb-2 text-[14px] font-semibold transition-colors ${activeTab === "basic" ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t("newItem.basicInfo")}</button>
            <button onClick={() => scrollToSection("modifications")} className={`pb-2 text-[14px] font-semibold transition-colors ${activeTab === "modifications" ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t("newItem.modifications")}</button>
            <button onClick={() => scrollToSection("sales")} className={`pb-2 text-[14px] font-semibold transition-colors ${activeTab === "sales" ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"}`}>{t("newItem.salesInfo")}</button>
          </div>
        </div>
      </div>

      {/* Form content */}
      <div ref={scrollContainerRef} className="p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          {/* === BASIC INFO === */}
          <div ref={basicInfoRef} className="space-y-6">
          {/* Item Type */}
          <div>
            <label className="mb-2 block text-sm font-medium">{t("newItem.itemType")} <span className="text-destructive">*</span></label>
            <RadioGroup
              value={itemType}
              onValueChange={(v) => {
                if (itemTypeLocked) return;
                handleItemTypeChange(v as "items" | "combo");
              }}
              className={cn("grid grid-cols-2 gap-3", itemTypeLocked && "pointer-events-none opacity-80")}
            >
              <div
                role="presentation"
                onClick={itemTypeLocked ? undefined : () => handleItemTypeChange("items")}
                className={cn(
                  "flex h-full min-h-0 flex-col justify-start rounded-lg border-2 p-4 text-left transition-colors",
                  itemTypeLocked ? "cursor-not-allowed" : "cursor-pointer",
                  itemType === "items" ? "border-foreground" : "border-border",
                  !itemTypeLocked && itemType !== "items" && "hover:border-muted-foreground",
                )}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <Label
                    htmlFor="item-type-items"
                    className={cn("min-w-0 flex-1 font-normal", itemTypeLocked ? "cursor-default" : "cursor-pointer")}
                  >
                    <span className="block text-[14px] font-semibold leading-snug">{t("newItem.itemsType")}</span>
                    <p className="mt-1 text-left text-xs text-muted-foreground">{t("newItem.itemsDesc")}</p>
                  </Label>
                  <RadioGroupItem value="items" id="item-type-items" className="mt-0.5 shrink-0" disabled={itemTypeLocked} />
                </div>
              </div>
              <div
                role="presentation"
                onClick={itemTypeLocked ? undefined : () => handleItemTypeChange("combo")}
                className={cn(
                  "flex h-full min-h-0 flex-col justify-start rounded-lg border-2 p-4 text-left transition-colors",
                  itemTypeLocked ? "cursor-not-allowed" : "cursor-pointer",
                  itemType === "combo" ? "border-foreground" : "border-border",
                  !itemTypeLocked && itemType !== "combo" && "hover:border-muted-foreground",
                )}
              >
                <div className="flex w-full items-start justify-between gap-2">
                  <Label
                    htmlFor="item-type-combo"
                    className={cn("min-w-0 flex-1 font-normal", itemTypeLocked ? "cursor-default" : "cursor-pointer")}
                  >
                    <span className="block text-[14px] font-semibold leading-snug">{t("newItem.comboType")}</span>
                    <p className="mt-1 text-left text-xs text-muted-foreground">{t("newItem.comboDesc")}</p>
                  </Label>
                  <RadioGroupItem value="combo" id="item-type-combo" className="mt-0.5 shrink-0" disabled={itemTypeLocked} />
                </div>
              </div>
            </RadioGroup>
            {itemTypeLocked ? (
              <p className="mt-2 text-xs text-muted-foreground">{t("newItem.itemTypeLockedHint")}</p>
            ) : null}
          </div>

          {/* Item Name */}
          <div ref={itemNameFieldRef}>
            <label className="mb-1 block text-sm font-medium">{t("newItem.itemName")} <span className="text-destructive">*</span></label>
            <div className="relative">
              <Input placeholder={t("newItem.pleaseEnter")} maxLength={50} value={itemName} onChange={(e) => setItemName(e.target.value)} className={submitted && !itemName.trim() ? "border-destructive focus-visible:ring-destructive" : ""} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{itemName.length}/50</span>
            </div>
            {submitted && !itemName.trim() && <p className="mt-1 text-xs text-destructive">{t("newItem.itemNameRequired")}</p>}
          </div>

          {/* PDV Code - hidden */}
          <div className="hidden">
            <label className="mb-1 block text-sm font-medium">{t("newItem.pdvCode")}</label>
            <div className="relative">
              <Input placeholder={t("newItem.pleaseEnter")} maxLength={50} value={pdvCode} onChange={(e) => setPdvCode(e.target.value)} />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">{pdvCode.length}/50</span>
            </div>
          </div>

          {/* Item Picture */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t("newItem.itemPicture")}</label>
            <p className="mb-3 text-xs text-[#BABABF]">{t("newItem.imageHelp")}</p>
            <div className="flex items-start gap-4">
              {uploadedImage ? (
                <div className="relative h-28 w-28 rounded-lg overflow-hidden border border-border">
                  <img src={uploadedImage} alt="Item" className="h-full w-full object-cover" />
                </div>
              ) : (
                <div onClick={() => setImageDialogOpen(true)} className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary hover:border-muted-foreground transition-colors">
                  <ImagePlus className="mb-1 h-8 w-8 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{t("newItem.addImage")}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setImageDialogOpen(true)}>
                  {uploadedImage ? t("newItem.editImage") : t("newItem.upload")}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-muted-foreground"
                  disabled={!uploadedImage}
                  onClick={() => setUploadedImage(null)}
                >
                  {t("newItem.deleteImage")}
                </Button>
              </div>
            </div>
            <ImageUploadDialog
              open={imageDialogOpen}
              onOpenChange={setImageDialogOpen}
              onImageSelected={(_file, previewUrl) => setUploadedImage(previewUrl)}
              initialImageUrl={uploadedImage ?? undefined}
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t("newItem.description")}</label>
            <Textarea placeholder={t("newItem.descriptionPlaceholder")} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          {/* Store-defined Category */}
          <div ref={categoryFieldRef}>
            <label className="mb-1 block text-sm font-medium">
              {t("newItem.storeDefinedCategory")} <span className="text-destructive">*</span>{" "}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <span className="inline-flex cursor-help align-middle">
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs">
                    {t("newItem.storeDefinedCategoryTooltip")}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </label>
            <Select value={selectedCategoryIdx} onValueChange={setSelectedCategoryIdx}>
              <SelectTrigger className={submitted && !selectedCategoryIdx ? "border-destructive focus:ring-destructive" : ""}>
                <SelectValue placeholder={t("newItem.pleaseSelect")} />
              </SelectTrigger>
              <SelectContent>
                {categories.map((cat, idx) => (
                  <SelectItem key={idx} value={String(idx)}>
                    {displayCategoryName(cat, t)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {submitted && !selectedCategoryIdx && <p className="mt-1 text-xs text-destructive">{t("newItem.categoryRequired")}</p>}
          </div>

          {/* 套餐份量（仅套餐类型） */}
          {itemType === "combo" ? (
            <div>
              <label className="mb-2 block text-sm font-medium">{t("newItem.comboPortionPrompt")}</label>
              <RadioGroup
                value={comboPortion}
                onValueChange={(v) => setComboPortion(v as ComboPortion)}
                className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5"
              >
                {COMBO_PORTION_OPTIONS.map((op) => (
                  <div
                    key={op.id}
                    role="presentation"
                    onClick={() => setComboPortion(op.id)}
                    className={cn(
                      "relative flex min-h-[92px] cursor-pointer flex-col justify-start rounded-lg border bg-secondary/50 p-3 pt-3.5 text-left transition-colors",
                      comboPortion === op.id ? "border-foreground" : "border-border hover:border-muted-foreground",
                    )}
                  >
                    <RadioGroupItem value={op.id} id={`combo-portion-${op.id}`} className="absolute right-2.5 top-2.5 shrink-0" />
                    <Label
                      htmlFor={`combo-portion-${op.id}`}
                      className="min-w-0 cursor-pointer pr-7 font-normal"
                    >
                      <span className="block text-sm font-semibold leading-snug">{t(op.labelKey)}</span>
                      <span className="mt-1 block text-xs text-muted-foreground">{t(op.rangeKey)}</span>
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>
          ) : null}

          {/* Item Classification - hidden */}
          <div className="hidden">
            <label className="mb-1 block text-sm font-medium">{t("newItem.itemClassification")} ℹ</label>
            <Select>
              <SelectTrigger><SelectValue placeholder={t("newItem.pleaseSelect")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="food">{t("newItem.food")}</SelectItem>
                <SelectItem value="drink">{t("newItem.drink")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Healthy food type - hidden */}
          <div className="hidden">
            <label className="mb-1 block text-sm font-medium">{t("newItem.healthyFoodType")}</label>
            <Select>
              <SelectTrigger><SelectValue placeholder={t("newItem.pleaseSelect")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t("newItem.none")}</SelectItem>
                <SelectItem value="low-cal">{t("newItem.lowCalorie")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Vegan - hidden */}
          <div className="hidden">
            <label className="mb-1 block text-sm font-medium">{t("newItem.vegan")}</label>
            <Select>
              <SelectTrigger><SelectValue placeholder={t("newItem.pleaseSelect")} /></SelectTrigger>
              <SelectContent>
                <SelectItem value="yes">{t("newItem.yes")}</SelectItem>
                <SelectItem value="no">{t("newItem.no")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Contains Alcohol */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t("newItem.containsAlcohol")}</label>
            <p className="mb-2 text-xs text-[#BABABF]">{t("newItem.alcoholWarning")}</p>
            <RadioGroup value={containsAlcohol} onValueChange={setContainsAlcohol} className="flex gap-6">
              <div className="flex items-center gap-2"><RadioGroupItem value="no" id="alc-no" /><Label htmlFor="alc-no">{t("newItem.no")}</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="alc-yes" /><Label htmlFor="alc-yes">{t("newItem.yes")}</Label></div>
            </RadioGroup>
          </div>

          </div>{/* end basic info section */}

          {/* === MODIFICATIONS SECTION === */}
          <div ref={modificationsRef} className="space-y-6">
          <div>
            {sslComboForm ? (
              <>
                <div className="mb-6 space-y-3">
                  <label className="block text-sm font-semibold text-foreground">
                    {t("newItem.comboMode")} <span className="text-destructive">*</span>
                  </label>
                  <RadioGroup
                    value={sslComboMode}
                    onValueChange={(v) => {
                      const next = v as "add_option_group" | "add_dishes";
                      if (sslComboForm && next !== sslComboMode) {
                        clearSslNewComboFormBelowComboMode();
                      }
                      setSslComboMode(next);
                    }}
                    className="flex flex-wrap gap-x-8 gap-y-2"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="add_option_group" id="ssl-combo-mode-groups" />
                      <Label htmlFor="ssl-combo-mode-groups" className="cursor-pointer font-normal">
                        {t("newItem.comboModeAddOptionGroup")}
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="add_dishes" id="ssl-combo-mode-dishes" />
                      <Label htmlFor="ssl-combo-mode-dishes" className="cursor-pointer font-normal">
                        {t("newItem.comboModeAddDishes")}
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
                <label className="mb-2 block text-sm font-semibold text-foreground">
                  {sslComboMode === "add_option_group"
                    ? t("newItem.modificationGroup")
                    : t("newItem.sslComboModificationsHeadingDishes")}
                </label>
              </>
            ) : (
              <label className="mb-2 block text-sm font-medium">{t("newItem.modificationGroup")}</label>
            )}

            {/* Modifier group cards */}
            {modifierGroups.map((group) => {
              const borderClass =
                group.status === "error"
                  ? "border-[hsl(340,82%,52%)]"
                  : group.status === "saved"
                    ? "border-border"
                    : "border-primary";
              const badgeBg =
                group.status === "saved" ? "bg-[hsl(142,71%,45%)]" : "bg-primary";
              const badgeText = group.status === "saved" ? t("newItem.saved") : t("newItem.unsaved");
              const isDragDisabled = modifierGroups.length <= 1;
              const minVal = getMinValue(group.min);
              const maxVal = getMaxValue(group.max);
              const allowMultipleDisabled = minVal === 1 && maxVal === 1;
              const reqDisabled = isRequiredDisabled(group.min, group.max);
              const reqForced = isRequiredForced(group.min);
              /** SSL「添加菜品」仅单菜已保存组用摘要稿面；「添加选项组」始终与 BR 相同，走下方完整卡片 */
              const sslSavedSummaryCard =
                sslComboForm &&
                sslComboMode === "add_dishes" &&
                group.status === "saved" &&
                group.items.length === 1;
              const cardQty = Math.max(1, parseInt(group.cardQuantity ?? "1", 10) || 1);

              if (sslSavedSummaryCard) {
                return (
                  <div
                    key={group.id}
                    className="mb-4 overflow-hidden rounded-lg border border-[#E8E8EC] bg-white shadow-sm"
                  >
                    <div className="flex items-center justify-between gap-3 border-b border-[#ECECEF] px-4 py-3">
                      <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-foreground">
                        {sslComboSavedCardTitle(group, t)}
                      </span>
                      <div className="flex shrink-0 items-center gap-2">
                        <div className="flex h-9 items-stretch overflow-hidden rounded-md border border-[#BABABF]">
                          <button
                            type="button"
                            className="flex w-9 items-center justify-center bg-white text-base leading-none text-foreground hover:bg-[#F2F2F5] disabled:opacity-40"
                            disabled={cardQty <= 1}
                            onClick={() => bumpSslSavedCardQuantity(group.id, -1)}
                            aria-label={t("newItem.sslComboCardQtyDec")}
                          >
                            −
                          </button>
                          <Input
                            value={String(cardQty)}
                            onChange={(e) => setSslSavedCardQuantityInput(group.id, e.target.value)}
                            className="h-9 w-11 rounded-none border-0 border-x border-[#BABABF] px-1 text-center text-sm shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
                            inputMode="numeric"
                          />
                          <button
                            type="button"
                            className="flex w-9 items-center justify-center bg-white text-base leading-none text-foreground hover:bg-[#F2F2F5]"
                            onClick={() => bumpSslSavedCardQuantity(group.id, 1)}
                            aria-label={t("newItem.sslComboCardQtyInc")}
                          >
                            +
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDeleteGroupId(group.id)}
                          className="rounded p-1.5 hover:bg-secondary"
                          aria-label="delete group"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                        </button>
                        <button
                          type="button"
                          onClick={() => toggleModifierCollapse(group.id)}
                          className="rounded p-1.5 hover:bg-secondary"
                          aria-label="toggle collapse"
                        >
                          {group.collapsed ? (
                            <ChevronDown className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          )}
                        </button>
                      </div>
                    </div>

                    {!group.collapsed ? (
                      <div className="bg-white">
                        <div className="flex items-center justify-between gap-4 border-t border-[#ECECEF] px-4 py-3 text-sm">
                          <span className="text-xs font-medium text-[#8E8E93]">{t("newItem.deliveryCol")}</span>
                          <span className="min-w-0 text-right font-medium tabular-nums text-foreground">
                            {formatSslAddDishesDeliveryDisplay(
                              group.items[0]?.price,
                              cardQty,
                              t,
                            )}
                          </span>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              }

              return (
                <div key={group.id} className={`mb-4 rounded-lg border-2 ${borderClass} bg-card`}>
                  {/* Header */}
                  <div className="flex items-center justify-between px-4 py-3 border-b border-border">
                    <div className="flex items-center gap-2">
                      <GripVertical
                        className={`h-5 w-5 ${
                          isDragDisabled ? "text-muted-foreground/30 cursor-not-allowed" : "text-muted-foreground cursor-grab hover:text-foreground"
                        }`}
                      />
                      <span className="text-[14px] font-semibold">
                        {stripOptionGroupNameSuffix(group.name) || t("newItem.newModifier")}
                      </span>
                      <Badge
                        className={cn(
                          badgeBg,
                          "rounded-[6px] border-transparent px-2.5 py-0.5 text-xs font-semibold hover:opacity-90",
                          group.status === "saved" ? "text-white" : "text-primary-foreground",
                        )}
                      >
                        {badgeText}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setDeleteGroupId(group.id)}
                        className="p-1.5 rounded hover:bg-secondary"
                        aria-label="delete group"
                      >
                        <Trash2 className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                      </button>
                      <div className="w-px h-5 bg-border mx-1" />
                      <button
                        onClick={() => toggleModifierCollapse(group.id)}
                        className="p-1.5 rounded hover:bg-secondary"
                        aria-label="toggle collapse"
                      >
                        {group.collapsed ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Collapsible body */}
                  {!group.collapsed && (
                    <div className="p-4 space-y-4">
                      {/* Form fields */}
                      <div className="grid grid-cols-[1fr_auto_auto] gap-3 items-end">
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">
                            {t("newItem.optionGroupName")}
                          </label>
                          <Input
                            placeholder={t("newItem.optionGroupNamePlaceholder")}
                            value={group.name}
                            onChange={(e) => updateModifierGroup(group.id, { name: e.target.value })}
                            className={group.status === "error" && !group.name.trim() ? "border-destructive" : ""}
                          />
                          {group.status === "error" && !group.name.trim() && (
                            <p className="mt-1 text-xs text-destructive">{t("newItem.optionGroupNameRequired")}</p>
                          )}
                        </div>

                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">{t("newItem.rangeMin")}</label>
                          <Input
                            className="w-16"
                            value={group.min}
                            onChange={(e) => {
                              const newMin = e.target.value;
                              const newMinVal = parseInt(newMin) || 0;
                              const newMaxVal = getMaxValue(group.max);
                              const updates: Partial<ModifierGroup> = { min: newMin };
                              if (newMinVal === 0) updates.required = false;
                              else if (newMinVal > 0 && newMinVal !== newMaxVal)
                                updates.required = true;
                              if (newMinVal === 1 && newMaxVal === 1) updates.allowMultiple = false;
                              updateModifierGroup(group.id, updates);
                            }}
                          />
                        </div>

                        <div className="flex items-end gap-1">
                          <span className="pb-2 text-muted-foreground">-</span>
                        <div>
                          <label className="mb-1 block text-xs text-muted-foreground">{t("newItem.rangeMax")}</label>
                            <Input
                              className="w-16"
                              value={group.max}
                              onChange={(e) => {
                                const newMax = e.target.value;
                                const newMaxVal = parseInt(newMax) || 0;
                                const updates: Partial<ModifierGroup> = { max: newMax };
                                if (minVal === 0) updates.required = false;
                                else if (minVal > 0 && minVal !== newMaxVal) updates.required = true;
                                if (minVal === 1 && newMaxVal === 1) updates.allowMultiple = false;
                                updateModifierGroup(group.id, updates);
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Checkboxes */}
                      <div className="space-y-2">
                        <label
                          className={`flex items-center gap-2 text-sm ${allowMultipleDisabled ? "opacity-50" : ""}`}
                        >
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            checked={allowMultipleDisabled ? false : group.allowMultiple}
                            disabled={allowMultipleDisabled}
                            onChange={(e) => updateModifierGroup(group.id, { allowMultiple: e.target.checked })}
                          />
                          {t("newItem.customerCanAddMultiple")}
                        </label>

                        <label className={`flex items-center gap-2 text-sm ${reqDisabled ? "opacity-50" : ""}`}>
                          <input
                            type="checkbox"
                            className="rounded border-border"
                            checked={reqDisabled ? reqForced : group.required}
                            disabled={reqDisabled}
                            onChange={(e) => updateModifierGroup(group.id, { required: e.target.checked })}
                          />
                          {t("newItem.requiredToSelect")}
                        </label>
                      </div>

                      {/* Items table */}
                      <div className="overflow-hidden rounded-lg bg-[#F7F8FA]">
                        <div className="grid grid-cols-[24px_1fr_100px_100px_60px] gap-2 items-center bg-[#F7F8FA] px-4 py-2 text-sm font-medium text-muted-foreground">
                          <span />
                          <span>{t("newItem.itemNameCol")}</span>
                          <span className="text-center">{t("newItem.priceCol")}</span>
                          <span className="text-center">最大数量</span>
                          <span />
                        </div>

                        {group.items.length === 0 ? (
                          <div className="py-8 text-center text-sm text-muted-foreground">
                            {t("newItem.pleaseLinkSubItems")}
                          </div>
                        ) : (
                          group.items.map((item, idx) => (
                            <SubItemRow
                              key={idx}
                              item={item}
                              idx={idx}
                              groupId={group.id}
                              totalItems={group.items.length}
                              onUpdate={(field, value) => {
                                setModifierGroups((prev) =>
                                  prev.map((g) => {
                                    if (g.id !== group.id) return g;
                                    const newItems = [...g.items];
                                    newItems[idx] = { ...newItems[idx], [field]: value };
                                    return { ...g, items: newItems, status: "unsaved" as const };
                                  }),
                                );
                              }}
                              onEdit={() => openEditModifierDialog(group.id, idx)}
                              onDelete={() => {
                                setModifierGroups((prev) =>
                                  prev.map((g) => {
                                    if (g.id !== group.id) return g;
                                    return {
                                      ...g,
                                      items: g.items.filter((_, i) => i !== idx),
                                      status: "unsaved" as const,
                                    };
                                  }),
                                );
                              }}
                              onDragStart={() => setDragItem({ groupId: group.id, idx })}
                              onDragOver={(e) => {
                                e.preventDefault();
                                if (dragItem && dragItem.groupId === group.id && dragItem.idx !== idx) {
                                  setModifierGroups((prev) =>
                                    prev.map((g) => {
                                      if (g.id !== group.id) return g;
                                      const newItems = [...g.items];
                                      const [moved] = newItems.splice(dragItem.idx, 1);
                                      newItems.splice(idx, 0, moved);
                                      setDragItem({ groupId: group.id, idx });
                                      return { ...g, items: newItems, status: "unsaved" as const };
                                    }),
                                  );
                                }
                              }}
                              onDragEnd={() => setDragItem(null)}
                            />
                          ))
                        )}
                      </div>

                      {/* Bottom actions */}
                      <div className="grid grid-cols-2 rounded-lg border border-border overflow-hidden">
                        <button
                          type="button"
                          onClick={() => {
                            setLinkExistingDishesMode("append");
                            setLinkExistingDishesGroupId(group.id);
                            setLinkExistingDishesOpen(true);
                          }}
                          className={cn(
                            "flex items-center justify-center gap-2 py-3 text-sm font-medium hover:bg-secondary transition-colors border-r border-border",
                            brOptionGroupActionClass,
                          )}
                        >
                          <Link2 className="h-4 w-4" />
                          {t("newItem.linkExistingModifier")}
                        </button>
                        <button
                          onClick={() => openNewModifierDialog(group.id)}
                          className={cn(
                            "flex items-center justify-center gap-2 py-3 text-sm font-medium hover:bg-secondary transition-colors",
                            brOptionGroupActionClass,
                          )}
                        >
                          <Plus className="h-4 w-4" />
                          {t("newItem.createNewModifier")}
                        </button>
                      </div>

                      {group.status === "error" && group.items.length === 0 && (
                        <p className="mt-2 text-xs text-destructive">{t("newItem.modifierGroupPleaseAddDishes")}</p>
                      )}

                      {/* Save button */}
                      <div className="mt-2 flex justify-end">
                        <Button
                          onClick={() => saveModifierGroup(group.id)}
                          className="h-8 w-[88px] bg-primary px-2 text-primary-foreground hover:bg-primary/90"
                        >
                          {t("newItem.save")}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Add group：SSL+添加菜品为单笔触达式主按钮；其余为悬停下拉 */}
            {sslComboForm && sslComboMode === "add_dishes" ? (
              <Button
                type="button"
                variant="outline"
                onClick={openSslAddDishesPicker}
                className={cn(
                  "h-auto min-h-10 w-full gap-1 py-3",
                  version === "br" && "text-[#212121] hover:text-[#212121]",
                )}
              >
                <Plus className="h-4 w-4" />
                {t("newItem.sslComboAddDishesCta")}
              </Button>
            ) : (
              <div className="relative group">
                <Button
                  variant="outline"
                  className={cn(
                    "h-auto min-h-10 w-full gap-1 py-3",
                    version === "br" && "text-[#212121] hover:text-[#212121]",
                  )}
                >
                  <Plus className="h-4 w-4" />
                  {sslComboForm && sslComboMode === "add_option_group"
                    ? t("newItem.sslComboAddOptionGroupCta")
                    : t("newItem.addGroup")}
                </Button>
                <div className="invisible opacity-0 group-hover:visible group-hover:opacity-100 transition-all duration-200 absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-border bg-card shadow-lg p-2 space-y-1">
                  <button
                    type="button"
                    onClick={addNewModifierGroup}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary transition-colors",
                      brOptionGroupActionClass,
                    )}
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
                      <Plus className="h-4 w-4" strokeWidth={2.25} />
                    </span>
                    {t("newItem.createNewGroup")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setLinkExistingGroupsDialogOpen(true)}
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary transition-colors",
                      brOptionGroupActionClass,
                    )}
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
                      <Link2 className="h-4 w-4" strokeWidth={2.25} />
                    </span>
                    {t("newItem.selectExistingGroup")}
                  </button>
                  <button
                    type="button"
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-3 text-sm font-medium hover:bg-secondary transition-colors",
                      brOptionGroupActionClass,
                    )}
                  >
                    <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center" aria-hidden>
                      <Copy className="h-4 w-4" strokeWidth={2.25} />
                    </span>
                    {t("newItem.copyOtherItemGroup")}
                  </button>
                </div>
              </div>
            )}
          </div>
          </div>{/* end modifications section */}

          {/* === SALES INFO SECTION === */}
          <div ref={salesInfoRef} className="space-y-6">
          {/* Price */}
          <div>
            <label className="mb-1 block text-sm font-medium">{t("newItem.price")} <span className="text-destructive">*</span></label>

            {itemType === "combo" ? (
              <div className="mb-3 space-y-4 rounded-lg bg-[#F9F9FC] p-4">
                <h3 className="text-[14px] font-semibold text-foreground">{t("newItem.comboDeliverySection")}</h3>

                <div>
                  <label className="mb-1 block text-sm font-medium text-foreground">
                    {t("newItem.comboSetOriginalPrice")}
                  </label>
                  {sslComboAutoOriginalFromDishes ? (
                    <p className="mb-2 text-xs text-muted-foreground">{t("newItem.sslComboOriginalAutoSumHint")}</p>
                  ) : null}
                  <SuffixInput
                    value={comboOriginalPrice}
                    onChange={onComboOriginalChange}
                    placeholder={t("newItem.comboPricePlaceholder")}
                    suffix="R$"
                    disabled={sslComboAutoOriginalFromDishes}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-4">
                  <div ref={discountComboFieldRef} className="relative">
                    <label className="mb-1 block text-sm font-medium text-foreground">{t("newItem.comboDiscount")}</label>
                    <div className="flex min-h-10 overflow-hidden rounded-md border border-[#BABABF] bg-transparent transition-colors focus-within:border-black">
                      <Input
                        value={comboDiscountPercent}
                        onChange={onComboDiscountChange}
                        onFocus={() => setDiscountPresetPanelOpen(true)}
                        onBlur={() => {
                          window.setTimeout(() => {
                            if (!discountComboFieldRef.current?.contains(document.activeElement)) {
                              setDiscountPresetPanelOpen(false);
                            }
                          }, 0);
                        }}
                        placeholder={t("newItem.comboDiscount")}
                        inputMode="decimal"
                        className="h-10 min-w-0 flex-1 border-0 bg-transparent px-3 py-2 text-base shadow-none placeholder:text-[#BABABF] focus-visible:ring-0 focus-visible:ring-offset-0 rounded-none md:text-sm"
                      />
                      <div className="flex shrink-0 items-center border-l border-[#BABABF] bg-[#F2F2F5] px-3 text-sm font-medium text-muted-foreground">
                        %
                      </div>
                    </div>
                    {discountPresetPanelOpen ? (
                      <div
                        role="listbox"
                        aria-label={t("newItem.comboDiscountPresetsAria")}
                        className="absolute left-0 right-0 top-[calc(100%+4px)] z-50 overflow-hidden rounded-lg border border-border bg-popover py-0 text-popover-foreground shadow-lg"
                        onMouseDown={(e) => e.preventDefault()}
                      >
                        {COMBO_DISCOUNT_PRESETS.map((preset) => (
                          <button
                            key={preset.percent}
                            type="button"
                            role="option"
                            className="w-full border-b border-border px-3 py-3 text-left transition-colors last:border-b-0 hover:bg-[#F7F7FA] focus:bg-[#F7F7FA] focus:outline-none"
                            onClick={() => {
                              const s = String(preset.percent);
                              setComboDiscountPercent(s);
                              recalcComboDeliveryFromOriginalAndDiscount(comboOriginalPrice, s);
                              setDiscountPresetPanelOpen(false);
                            }}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="text-sm font-semibold text-foreground">{t(preset.titleKey)}</span>
                              {preset.recommended ? (
                                <Badge
                                  variant="outline"
                                  className="shrink-0 gap-0.5 rounded-full border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700"
                                >
                                  <ThumbsUp className="h-3 w-3" aria-hidden />
                                  {t("newItem.comboDiscountRecommended")}
                                </Badge>
                              ) : null}
                            </div>
                            <p className="mt-1 text-xs leading-snug text-muted-foreground">{t(preset.descKey)}</p>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <div ref={deliveryPriceFieldRef}>
                    <label className="mb-1 block text-sm font-medium text-foreground">
                      {t("newItem.comboPriceAfterDiscount")} <span className="text-destructive">*</span>
                    </label>
                    <SuffixInput
                      value={deliveryPrice}
                      onChange={onComboDiscountedChange}
                      placeholder={t("newItem.comboPricePlaceholder")}
                      suffix="R$"
                      invalid={
                        comboDiscountedExceedsOriginal || (submitted && !deliveryPrice.trim())
                      }
                    />
                    {comboDiscountedExceedsOriginal ? (
                      <p className="mt-1 text-xs text-destructive">
                        {t("newItem.comboDiscountedExceedsOriginal")}
                      </p>
                    ) : submitted && !deliveryPrice.trim() ? (
                      <p className="mt-1 text-xs text-destructive">{t("newItem.deliveryPriceRequired")}</p>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center gap-3 rounded-lg bg-[#EFEFF2] p-3 text-sm">
                  <span
                    className="flex h-[20px] w-[20px] shrink-0 items-center justify-center rounded-full bg-white text-muted-foreground shadow-sm"
                    aria-hidden
                  >
                    <TrendingUp className="h-3 w-3" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="leading-snug text-foreground">{t("newItem.comboDiscountTip")}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div ref={deliveryPriceFieldRef} className="mb-3 rounded-lg p-4 bg-[#F9F9FC]">
                <div className="mb-2">
                  <span className="text-[14px] font-semibold">{t("newItem.deliveryTitle")}</span>
                </div>
                <div className="relative">
                  <Input
                    placeholder={t("newItem.pleaseEnter")}
                    value={deliveryPrice}
                    onChange={(e) => setDeliveryPrice(e.target.value)}
                    className={cn(
                      submitted && !deliveryPrice.trim() ? "border-destructive focus-visible:ring-destructive" : "",
                      "pr-10",
                    )}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    R$
                  </span>
                </div>
                {submitted && !deliveryPrice.trim() ? (
                  <p className="mt-1 text-xs text-destructive">{t("newItem.deliveryPriceRequired")}</p>
                ) : null}
              </div>
            )}
          </div>

          {/* Stocking - hidden */}
          <div className="hidden">
            <label className="mb-2 block text-sm font-medium">{t("newItem.stocking")}</label>
            <RadioGroup value={stockType} onValueChange={setStockType} className="flex gap-6">
              <div className="flex items-center gap-2"><RadioGroupItem value="unlimited" id="stock-unlimited" /><Label htmlFor="stock-unlimited">{t("newItem.unlimited")}</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="custom" id="stock-custom" /><Label htmlFor="stock-custom">{t("newItem.custom")}</Label></div>
            </RadioGroup>
            {stockType === "custom" && <Input className="mt-2 w-32" placeholder={t("newItem.number")} type="number" value={stockCount} onChange={(e) => setStockCount(e.target.value)} />}
          </div>

          {/* Can Be Sold Separately */}
          <div>
            <label className="mb-2 block text-sm font-medium">{t("newItem.canBeSoldSeparately")}</label>
            <RadioGroup value={canSoldSeparately} onValueChange={setCanSoldSeparately} className="flex gap-6">
              <div className="flex items-center gap-2"><RadioGroupItem value="yes" id="sep-yes" /><Label htmlFor="sep-yes">{t("newItem.yes")}</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="no" id="sep-no" /><Label htmlFor="sep-no">{t("newItem.no")}</Label></div>
            </RadioGroup>
          </div>

          {/* Available Time */}
          <div>
            <label className="mb-2 block text-sm font-medium">{t("newItem.saleTime")}</label>
            <RadioGroup value={saleTimeType} onValueChange={setSaleTimeType} className="flex gap-6">
              <div className="flex items-center gap-2"><RadioGroupItem value="allDay" id="time-allDay" /><Label htmlFor="time-allDay">{t("newItem.allDay")}</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="weekly" id="time-weekly" /><Label htmlFor="time-weekly">{t("newItem.weeklyCycle")}</Label></div>
              <div className="flex items-center gap-2"><RadioGroupItem value="specific" id="time-specific" /><Label htmlFor="time-specific">{t("newItem.specificDate")}</Label></div>
            </RadioGroup>
          </div>

          </div>{/* end sales info section */}

        </div>{/* end max-w-2xl */}
      </div>{/* end form content */}

      {/* Sticky bottom action buttons */}
      <div className="sticky bottom-0 border-t border-border bg-white px-6 py-4">
        <div className="mx-auto flex max-w-2xl gap-3">
          <Button
            onClick={handleSubmit}
            className="w-[88px] bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isEdit ? t("newItem.save") : t("newItem.submit")}
          </Button>
          <Button variant="outline" className="w-[88px]" onClick={() => navigate("/")}>
            {t("newItem.discard")}
          </Button>
        </div>
      </div>
      </div>

      {/* New Modifier Dialog */}
      <Dialog
        open={newModifierDialogOpen}
        onOpenChange={(open) => {
          setNewModifierDialogOpen(open);
          if (!open) setRangeMaxFieldFocused(false);
        }}
      >
        <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {newModifierEditIdx !== null ? t("newItem.editItem") : t("newItem.newItem")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-5 pt-2">
            {/* Name */}
            <div>
              <label className="mb-1 block text-[14px] font-medium">
                {t("newItem.modifierName")} <span className="text-[hsl(340,82%,52%)]">*</span>
              </label>
              <Input
                placeholder={t("newItem.pleaseEnter")}
                value={newModifierName}
                onChange={(e) => setNewModifierName(e.target.value)}
              />
            </div>

            {/* Store-defined Category */}
            <div>
              <label className="mb-1 block text-[14px] font-medium">
                {t("newItem.storeDefinedCategory")} <span className="text-[hsl(340,82%,52%)]">*</span>{" "}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex cursor-help align-middle">
                        <Info className="h-4 w-4 text-muted-foreground" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="max-w-xs">
                      {t("newItem.storeDefinedCategoryTooltip")}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </label>
              <Select value={newModifierCategory} onValueChange={setNewModifierCategory}>
                <SelectTrigger>
                  <SelectValue placeholder={t("newItem.pleaseSelect")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {displayCategoryName(cat, t)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Price */}
            <div>
              <label className="mb-1 block text-[14px] font-medium">{t("newItem.priceCol")}</label>
              <div className="mb-3 rounded-lg p-4 bg-[#F9F9FC]">
                <div className="mb-2">
                  <span className="text-[14px] font-semibold">{t("newItem.deliveryTitle")}</span>
                </div>
                <div className="relative">
                  <Input
                    placeholder={t("newItem.pleaseEnter")}
                    value={newModifierDeliveryPrice}
                    onChange={(e) => setNewModifierDeliveryPrice(e.target.value)}
                    className="pr-10"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    R$
                  </span>
                </div>
              </div>
            </div>

            {/* Stocking - hidden */}
            <div className="hidden">
              <label className="mb-1 block text-[14px] font-medium">{t("newItem.stocking")}</label>
              <RadioGroup value={newModifierStockType} onValueChange={setNewModifierStockType} className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="unlimited" id="mod-stock-unlimited" />
                  <Label className="text-[14px] font-normal" htmlFor="mod-stock-unlimited">
                    {t("newItem.unlimited")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" id="mod-stock-custom" />
                  <Label className="text-[14px] font-normal" htmlFor="mod-stock-custom">
                    {t("newItem.custom")}
                  </Label>
                </div>
              </RadioGroup>
              {newModifierStockType === "custom" && (
                <Input
                  type="number"
                  className="mt-2 w-32"
                  value={newModifierStockCount}
                  onChange={(e) => setNewModifierStockCount(e.target.value)}
                />
              )}
            </div>

            {/* Range max (sub-item): default unlimited; only integers &gt; 1 */}
            <div>
              <label className="mb-1 block text-[14px] font-medium">{t("newItem.rangeMax")}</label>
              <Input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                className={cn(
                  "max-w-[200px]",
                  subItemRangeMaxReadonlyUnlimited && "cursor-pointer text-muted-foreground",
                )}
                readOnly={subItemRangeMaxReadonlyUnlimited}
                value={
                  subItemRangeMaxReadonlyUnlimited
                    ? t("newItem.rangeMaxUnlimited")
                    : newModifierMaxLimit
                }
                placeholder={
                  rangeMaxFieldFocused ? t("newItem.rangeMaxInputPlaceholder") : undefined
                }
                onFocus={() => setRangeMaxFieldFocused(true)}
                onBlur={() => {
                  setNewModifierMaxLimit((prev) => normalizeSubItemRangeMax(prev));
                  setRangeMaxFieldFocused(false);
                }}
                onChange={(e) => {
                  const digits = e.target.value.replace(/\D/g, "");
                  setNewModifierMaxLimit(digits);
                }}
              />
            </div>

            {/* Can be sold separately */}
            <div>
              <label className="mb-1 block text-[14px] font-medium">{t("newItem.canSoldSeparately")}</label>
              <RadioGroup value={newModifierCanSoldSeparately} onValueChange={setNewModifierCanSoldSeparately} className="flex gap-6">
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="mod-sold-yes" />
                  <Label className="text-[14px] font-normal" htmlFor="mod-sold-yes">
                    {t("newItem.canSoldYes")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="mod-sold-no" />
                  <Label className="text-[14px] font-normal" htmlFor="mod-sold-no">
                    {t("newItem.canSoldNo")}
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <Button variant="outline" onClick={() => setNewModifierDialogOpen(false)}>
                {t("newItem.cancel")}
              </Button>
              <Button
                onClick={handleNewModifierSubmit}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {t("menuList.ok")}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <LinkExistingOptionGroupsDialog
        open={linkExistingGroupsDialogOpen}
        onOpenChange={setLinkExistingGroupsDialogOpen}
        groups={PRESET_OPTION_GROUPS}
        onConfirm={handleLinkExistingGroupsConfirm}
      />

      <LinkExistingDishesDialog
        open={linkExistingDishesOpen}
        onOpenChange={(open) => {
          setLinkExistingDishesOpen(open);
          if (!open) {
            setLinkExistingDishesGroupId(null);
            setLinkExistingDishesMode(null);
          }
        }}
        excludeItemId={itemId}
        existingNamesLower={linkExistingDishesExistingNamesLower}
        onConfirm={handleLinkExistingDishesConfirm}
      />

      <AlertDialog open={!!deleteGroupId} onOpenChange={(open) => !open && setDeleteGroupId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("menuList.deleteCategory")}</AlertDialogTitle>
            <AlertDialogDescription>{t("menuList.deleteCategoryWarning")}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("menuList.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteGroupId) removeModifierGroup(deleteGroupId);
                setDeleteGroupId(null);
              }}
            >
              {t("menuList.delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
};

export default NewItemPage;
