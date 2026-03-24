import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ChevronDown } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { PresetOptionGroup } from "@/data/presetOptionGroups";

type LinkExistingOptionGroupsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** 可选列表数据源，便于后续替换为接口数据 */
  groups: PresetOptionGroup[];
  onConfirm: (selected: PresetOptionGroup[]) => void;
};

const normalizePriceDisplay = (raw: string): string => {
  const t = raw.trim();
  if (t.startsWith("R$")) return t.startsWith("R$ ") ? t : t.replace(/^R\$/, "R$ ");
  return `R$ ${t}`;
};

export function LinkExistingOptionGroupsDialog({
  open,
  onOpenChange,
  groups,
  onConfirm,
}: LinkExistingOptionGroupsDialogProps) {
  const { t } = useTranslation();
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!open) return;
    setSelectedIds(new Set());
    const firstId = groups[0]?.id;
    setExpandedIds(firstId ? new Set([firstId]) : new Set());
  }, [open, groups]);

  const toggleSelected = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleOk = () => {
    const selected = groups.filter((g) => selectedIds.has(g.id));
    onConfirm(selected);
    onOpenChange(false);
  };

  const selectedCount = selectedIds.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex max-h-[80vh] max-w-[520px] flex-col gap-0 overflow-hidden rounded-2xl border border-[#E8E8EC] bg-white p-0 shadow-lg sm:rounded-2xl",
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <div className="shrink-0 px-6 pb-4 pt-6">
          <DialogTitle className="pr-10 text-left text-base font-bold text-foreground">
            {t("newItem.linkExistingGroupModalTitle")}
          </DialogTitle>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto border-y border-[#ECECEF]">
          {groups.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              {t("newItem.linkExistingGroupNoResults")}
            </div>
          ) : (
            groups.map((g) => {
              const expanded = expandedIds.has(g.id);
              const checked = selectedIds.has(g.id);
              const summary = t("newItem.linkExistingGroupSummaryLine", {
                count: g.modifiers.length,
                min: g.min,
                max: g.max,
              });

              return (
                <div key={g.id} className="border-b border-[#ECECEF] last:border-b-0">
                  <div className="flex items-stretch gap-3 px-6 py-4">
                    <label className="flex shrink-0 cursor-pointer items-start pt-0.5">
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSelected(g.id)}
                        className="h-5 w-5 rounded border border-[#BABABF] text-white accent-black checked:border-black checked:bg-black focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(g.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="text-sm font-bold text-foreground">{g.title}</div>
                      <div className="mt-1 text-xs text-[#8E8E93]">{summary}</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExpanded(g.id)}
                      className="flex shrink-0 items-start pt-0.5 text-[#8E8E93] hover:text-foreground"
                      aria-expanded={expanded}
                      aria-label={expanded ? t("newItem.collapseGroup") : t("newItem.expandGroup")}
                    >
                      <ChevronDown
                        className={cn("h-5 w-5 transition-transform duration-200", expanded && "rotate-180")}
                      />
                    </button>
                  </div>
                  {expanded && g.modifiers.length > 0 && (
                    <div className="mx-6 mb-4 space-y-0 overflow-hidden rounded-lg bg-[#F2F3F5] px-4 py-2">
                      {g.modifiers.map((m, idx) => (
                        <div
                          key={`${g.id}-${idx}`}
                          className="flex items-center justify-between gap-4 border-b border-[#E4E5E8] py-2.5 text-sm last:border-b-0"
                        >
                          <span className="min-w-0 font-medium text-foreground">{m.name}</span>
                          <span className="shrink-0 tabular-nums text-[#8E8E93]">
                            {normalizePriceDisplay(m.price)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-4 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            {t("newItem.linkExistingGroupSelectedCount", { count: selectedCount })}
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
              className="h-10 min-w-[88px] rounded-lg border-0 bg-[hsl(48,96%,53%)] text-foreground hover:bg-[hsl(48,96%,45%)]"
            >
              {t("newItem.linkExistingGroupOk")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
