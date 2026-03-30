import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useVersion } from "@/app/providers/VersionProvider";
import type { AppVersion } from "@/config/version";
import { useMenu, type MenuItem } from "@/contexts/MenuContext";
import { formatPriceAmount } from "@/domains/dishes/model/menuItemMappers";
import { displayItemTitle } from "@/i18n/builtinDisplay";

const PAGE_SIZE = 7;

export type LinkedDishPick = {
  /** 当前语言下的展示名，写入表单子项名称 */
  name: string;
  price: string;
  /** 来源菜单项 id，用于展开选项组快照 */
  sourceItemId: string;
};

type LinkExistingDishesDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 编辑中的菜品 id，避免在列表中出现自身 */
  excludeItemId?: string;
  /** 当前选项组已有子项展示名，用于去重 */
  existingNamesLower: Set<string>;
  onConfirm: (items: LinkedDishPick[]) => void;
};

function flattenMenuItems(categoryItems: Record<number, MenuItem[]>): MenuItem[] {
  const out: MenuItem[] = [];
  for (const key of Object.keys(categoryItems)) {
    for (const item of categoryItems[Number(key)] || []) {
      out.push(item);
    }
  }
  return out;
}

function rowDisabled(item: MenuItem, version: AppVersion): boolean {
  if (item.itemType === "combo") return true;
  /** BR：含选项组的菜作为子项关联易与层级冲突，禁用；SSL「添加菜品」仅需主菜价与名称，允许选择 */
  if (version === "ssl") return false;
  return (item.addOns?.length ?? 0) > 0;
}

export function LinkExistingDishesDialog({
  open,
  onOpenChange,
  excludeItemId,
  existingNamesLower,
  onConfirm,
}: LinkExistingDishesDialogProps) {
  const { t } = useTranslation();
  const { version } = useVersion();
  const { categoryItems } = useMenu();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = flattenMenuItems(categoryItems).filter((item) => item.id !== excludeItemId);
    const mapped = all.map((item) => {
      const label = displayItemTitle(item, t);
      const disabled = rowDisabled(item, version);
      return {
        id: item.id,
        item,
        label,
        priceLine: item.deliveryPrice || "",
        disabled,
      };
    });
    const filtered = q
      ? mapped.filter((r) => r.label.toLowerCase().includes(q) || r.item.title.toLowerCase().includes(q))
      : mapped;
    filtered.sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }));
    return filtered;
  }, [categoryItems, excludeItemId, search, t, version]);

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const safePage = Math.max(1, Math.min(page, totalPages));
  const pageRows = useMemo(() => {
    const p = Math.min(Math.max(1, page), totalPages);
    const start = (p - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page, totalPages]);

  useEffect(() => {
    if (!open) return;
    setSearch("");
    setPage(1);
    setSelectedIds(new Set());
    setHoveredId(null);
  }, [open]);

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const toggle = (id: string, disabled: boolean) => {
    if (disabled) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOk = () => {
    const picks: LinkedDishPick[] = [];
    for (const r of rows) {
      if (!selectedIds.has(r.id) || r.disabled) continue;
      const name = r.label.trim();
      if (existingNamesLower.has(name.toLowerCase())) continue;
      picks.push({
        name,
        price: r.item.deliveryPrice?.trim() ? r.item.deliveryPrice : formatPriceAmount("", version),
        sourceItemId: r.item.id,
      });
    }
    if (picks.length > 0) onConfirm(picks);
    onOpenChange(false);
  };

  const selectedCount = selectedIds.size;

  const pageNumbers = useMemo(() => {
    if (totalPages <= 5) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const cur = safePage;
    const set = new Set<number>();
    set.add(1);
    set.add(totalPages);
    for (let d = -1; d <= 1; d++) {
      const n = cur + d;
      if (n >= 1 && n <= totalPages) set.add(n);
    }
    return [...set].sort((a, b) => a - b);
  }, [totalPages, safePage]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[85vh] max-w-[520px] flex-col gap-0 overflow-hidden rounded-2xl border border-[#E8E8EC] bg-white p-0 shadow-lg sm:rounded-2xl",
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="shrink-0 px-6 pb-4 pt-6">
          <DialogTitle className="pr-10 text-left text-base font-bold text-foreground">
            {t("newItem.linkExistingSubItemsModalTitle")}
          </DialogTitle>
        </div>

        <div className="shrink-0 px-6 pb-3">
          <div className="relative">
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t("newItem.linkExistingSubItemsSearchPlaceholder")}
              className="h-10 rounded-lg border-[#BABABF] pr-10 text-sm placeholder:text-[#BABABF] focus-visible:ring-black"
            />
            <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8E8E93]" />
          </div>
        </div>

        <div className="min-h-[280px] flex-1 overflow-y-auto border-y border-[#ECECEF]">
          {rows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              {t("newItem.linkExistingSubItemsNoResults")}
            </div>
          ) : (
            pageRows.map((r) => {
              const checked = selectedIds.has(r.id);
              const rowHover = hoveredId === r.id && !r.disabled;
              return (
                <div
                  key={r.id}
                  className={cn(
                    "border-b border-[#ECECEF] px-6 py-3 transition-colors last:border-b-0",
                    rowHover && "bg-[#F2F2F5]",
                  )}
                  onMouseEnter={() => setHoveredId(r.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <div className="flex gap-3">
                    <label
                      className={cn(
                        "flex shrink-0 cursor-pointer items-start pt-0.5",
                        r.disabled && "cursor-not-allowed opacity-60",
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={r.disabled}
                        onChange={() => toggle(r.id, r.disabled)}
                        className="h-5 w-5 rounded border border-[#BABABF] text-white accent-black checked:border-black checked:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      />
                    </label>
                    <div className="min-w-0 flex-1">
                      <div
                        className={cn("text-sm font-bold text-foreground", r.disabled && "text-muted-foreground")}
                      >
                        {r.label}
                      </div>
                      {!(r.disabled && r.item.itemType === "combo") ? (
                        <div className="mt-0.5 text-xs text-[#8E8E93]">{r.priceLine}</div>
                      ) : null}
                      {r.disabled ? (
                        <p className="mt-1 text-xs font-medium text-[hsl(28,92%,48%)]">
                          {r.item.itemType === "combo"
                            ? t("newItem.linkExistingSubItemsCannotAddCombo")
                            : t("newItem.linkExistingSubItemsHasModifiersWarning")}
                        </p>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {rows.length > 0 ? (
          <div className="flex shrink-0 items-center justify-center gap-1 border-b border-[#ECECEF] py-3">
            <button
              type="button"
              aria-label={t("newItem.linkExistingSubItemsPrevPage")}
              disabled={safePage <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#8E8E93] hover:bg-[#F2F2F5] disabled:opacity-30"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            {pageNumbers.map((num, idx) => {
              const prev = pageNumbers[idx - 1];
              const showGap = idx > 0 && prev !== undefined && num - prev > 1;
              return (
                <span key={num} className="flex items-center gap-1">
                  {showGap ? <span className="px-1 text-xs text-[#BABABF]">…</span> : null}
                  <button
                    type="button"
                    onClick={() => setPage(num)}
                    className={cn(
                      "flex h-8 min-w-8 items-center justify-center rounded-full px-2 text-sm font-medium",
                      num === safePage
                        ? "bg-[#E8E8EC] text-foreground"
                        : "text-[#8E8E93] hover:bg-[#F2F2F5]",
                    )}
                  >
                    {num}
                  </button>
                </span>
              );
            })}
            <button
              type="button"
              aria-label={t("newItem.linkExistingSubItemsNextPage")}
              disabled={safePage >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="flex h-8 w-8 items-center justify-center rounded-full text-[#8E8E93] hover:bg-[#F2F2F5] disabled:opacity-30"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
        ) : null}

        <div className="flex shrink-0 flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            {t("newItem.linkExistingSubItemsSelectedCount", { count: selectedCount })}
          </p>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="h-10 min-w-[88px] rounded-lg border-black bg-white text-foreground hover:bg-[#F7F7F9]"
            >
              {t("newItem.cancel")}
            </Button>
            <Button
              type="button"
              onClick={handleOk}
              className="h-10 min-w-[88px] rounded-lg border-0 bg-primary font-semibold text-primary-foreground hover:bg-primary/90"
            >
              {t("menuList.ok")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
