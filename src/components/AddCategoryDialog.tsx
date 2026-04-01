import { useEffect, type RefObject } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export type AddCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (name: string) => void;
  onConfirm: () => void;
  inputRef?: RefObject<HTMLInputElement | null>;
};

/** 列表页与菜品新建/编辑页共用的「新建分类」弹窗，保持 UI 与交互一致 */
export function AddCategoryDialog({
  open,
  onOpenChange,
  name,
  onNameChange,
  onConfirm,
  inputRef,
}: AddCategoryDialogProps) {
  const { t } = useTranslation();

  useEffect(() => {
    if (open && inputRef?.current) inputRef.current.focus();
  }, [open, inputRef]);

  const handleOpenChange = (next: boolean) => {
    if (!next) onNameChange("");
    onOpenChange(next);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("menuList.addCategory")}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <Input
            ref={inputRef}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder={t("menuList.enterCategoryName")}
            className="h-12"
            onKeyDown={(e) => {
              if (e.key === "Enter" && name.trim()) onConfirm();
            }}
          />
        </div>
        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => handleOpenChange(false)}>
            {t("menuList.cancel")}
          </Button>
          <Button
            onClick={onConfirm}
            disabled={!name.trim()}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {t("menuList.ok")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
