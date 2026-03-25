import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ArrowUpToLine, GripVertical, X, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface SortItem {
  id: string;
  title: string;
  image: string;
}

function isItemImageUrl(image: unknown): boolean {
  if (typeof image !== "string") return false;
  return /^(https?|blob|data):/.test(image) || (image.includes("/") && image.length > 4);
}

interface ItemSortDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categoryName: string;
  items: SortItem[];
  onSave: (reordered: SortItem[]) => void;
}

export const ItemSortDialog = ({
  open,
  onOpenChange,
  categoryName,
  items: initialItems,
  onSave,
}: ItemSortDialogProps) => {
  const { t } = useTranslation();
  const [items, setItems] = useState(initialItems);
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  useEffect(() => {
    if (open) setItems([...initialItems]);
  }, [open, initialItems]);

  const handleOpenChange = (val: boolean) => {
    if (val) setItems([...initialItems]);
    onOpenChange(val);
  };

  const handlePinToTop = (idx: number) => {
    if (idx === 0) return;
    const newItems = [...items];
    const [item] = newItems.splice(idx, 1);
    newItems.unshift(item);
    setItems(newItems);
  };

  const handleDragStart = (idx: number) => {
    dragItem.current = idx;
    setDraggingIdx(idx);
  };

  const handleDragEnter = (idx: number) => {
    dragOverItem.current = idx;
  };

  const handleDragEnd = () => {
    if (dragItem.current === null || dragOverItem.current === null) {
      setDraggingIdx(null);
      return;
    }
    const newItems = [...items];
    const [draggedItem] = newItems.splice(dragItem.current, 1);
    newItems.splice(dragOverItem.current, 0, draggedItem);
    setItems(newItems);
    dragItem.current = null;
    dragOverItem.current = null;
    setDraggingIdx(null);
  };

  const handleSave = () => {
    onSave(items);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className="sm:max-w-lg flex flex-col p-0 [&>button.absolute]:hidden"
        style={{ maxHeight: "calc(100vh - 120px)" }}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-border">
          <DialogTitle>{t("itemSortDialog.title")}</DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-2.5 my-3">
            <Info className="h-4 w-4 text-primary shrink-0" />
            <span className="text-sm text-foreground">{t("itemSortDialog.categoryLabel")} : {categoryName}</span>
          </div>

          {items.map((item, idx) => (
            <div
              key={`${item.id}-${idx}`}
              draggable
              onDragStart={() => handleDragStart(idx)}
              onDragEnter={() => handleDragEnter(idx)}
              onDragEnd={handleDragEnd}
              onDragOver={(e) => e.preventDefault()}
              className={`flex items-center justify-between px-3 py-3 border-b border-border last:border-b-0 select-none transition-colors ${
                draggingIdx === idx
                  ? "opacity-50 bg-secondary"
                  : "bg-background"
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-secondary text-xl">
                  {isItemImageUrl(item.image) ? (
                    <img
                      src={item.image}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  ) : item.image ? (
                    <span className="leading-none">{item.image}</span>
                  ) : null}
                </div>
                <span className="text-sm truncate">{item.title}</span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handlePinToTop(idx)}
                  disabled={idx === 0}
                  className={`rounded p-1 transition-colors ${
                    idx === 0
                      ? "text-muted-foreground/30 cursor-not-allowed"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                  title={t("itemSortDialog.pinToTop")}
                >
                  <ArrowUpToLine className="h-4 w-4" />
                </button>
                <button
                  className="rounded p-1 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
                >
                  <GripVertical className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 px-6 py-4 border-t border-border">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("itemSortDialog.cancel")}
          </Button>
          <Button
            onClick={handleSave}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t("itemSortDialog.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
