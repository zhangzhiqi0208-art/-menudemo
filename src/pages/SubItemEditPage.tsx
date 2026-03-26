import { useState, useEffect, useRef } from "react";
import { flushSync } from "react-dom";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminLayout from "@/components/AdminLayout";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useMenu } from "@/contexts/MenuContext";
import {
  displayAddonGroupName,
  displayAddonItemName,
  displayItemTitle,
} from "@/i18n/builtinDisplay";
import { toast } from "@/hooks/use-toast";
import { scrollFieldIntoViewInAdminMain } from "@/lib/scrollFieldIntoView";

const SubItemEditPage = () => {
  const navigate = useNavigate();
  const { parentId, groupIdx, subIdx } = useParams<{
    parentId: string;
    groupIdx: string;
    subIdx: string;
  }>();
  const { t, i18n } = useTranslation();
  const { getItemById, updateItem } = useMenu();

  const data = parentId ? getItemById(parentId) : null;
  const parentItem = data?.item;
  const categoryIndex = data?.categoryIndex ?? 0;

  const group = parentItem?.addOns?.[Number(groupIdx)];
  const subItem = group?.items?.[Number(subIdx)];

  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [stock, setStock] = useState("unlimited");
  const [stockCount, setStockCount] = useState("");
  const [status, setStatus] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const nameFieldRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (subItem) {
      setName(subItem.localeNameKey ? t(subItem.localeNameKey) : subItem.name);
      const rawPrice = subItem.deliveryPrice?.replace(/^R\$\s?/, "") || "";
      setPrice(rawPrice);
      setStock(
        subItem.stock === "999" || subItem.stock === "Unlimited" ? "unlimited" : "custom"
      );
      setStockCount(
        subItem.stock === "999" || subItem.stock === "Unlimited" ? "" : subItem.stock || ""
      );
      setStatus(subItem.status);
    }
  }, [subItem, t, i18n.language]);

  const handleSave = () => {
    flushSync(() => setSubmitted(true));
    if (!name.trim()) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => scrollFieldIntoViewInAdminMain(nameFieldRef.current));
      });
      return;
    }

    if (!parentItem || group === undefined || subItem === undefined) return;

    const stockVal = stock === "unlimited" ? "999" : stockCount || "0";
    const formattedPrice = price.trim() ? `R$${price.trim()}` : "R$0.00";

    const trimmed = name.trim();
    let resolvedName: string;
    let nextLocaleNameKey = subItem.localeNameKey;
    let nextLocaleWarningKey = subItem.localeWarningKey;
    if (subItem.localeNameKey) {
      if (trimmed === t(subItem.localeNameKey) || trimmed === subItem.name) {
        resolvedName = subItem.name;
      } else {
        nextLocaleNameKey = undefined;
        nextLocaleWarningKey = undefined;
        resolvedName = trimmed;
      }
    } else {
      resolvedName = trimmed;
    }

    const newAddOns = (parentItem.addOns || []).map((g, gIdx) =>
      gIdx === Number(groupIdx)
        ? {
            ...g,
            items: g.items.map((s, sIdx) =>
              sIdx === Number(subIdx)
                ? {
                    ...s,
                    name: resolvedName,
                    localeNameKey: nextLocaleNameKey,
                    localeWarningKey: nextLocaleWarningKey,
                    deliveryPrice: formattedPrice,
                    pickupPrice: formattedPrice,
                    stock: stockVal,
                    status,
                  }
                : s
            ),
          }
        : g
    );

    updateItem(parentId!, { addOns: newAddOns });
    toast({ title: t("newItem.itemUpdated") });
    navigate("/", { state: { selectCategory: categoryIndex } });
  };

  if (!parentItem || !group || subItem === undefined) {
    return (
      <AdminLayout>
        <div className="p-6">
          <p className="text-muted-foreground">{t("menuList.pleaseSaveFirst")}</p>
          <Button variant="outline" className="mt-4" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("newItem.back")}
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-[16px] flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("newItem.back")}
          </Button>
          <h1 className="text-lg font-semibold">
            {t("newItem.editSubItem")} · {displayAddonItemName(subItem, t)}
          </h1>
          <div className="w-16" />
        </div>

        <div className="mx-auto max-w-xl space-y-6">
          <p className="text-sm text-muted-foreground">
            {displayItemTitle(parentItem, t)} → {displayAddonGroupName(group, t)}
          </p>

          <div ref={nameFieldRef}>
            <Label className="mb-1 block">
              {t("newItem.modifierName")} <span className="text-destructive">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("newItem.pleaseEnter")}
              className={submitted && !name.trim() ? "border-destructive" : ""}
            />
            {submitted && !name.trim() && (
              <p className="mt-1 text-xs text-destructive">
                {t("newItem.modifierNameRequired")}
              </p>
            )}
          </div>

          <div>
            <Label className="mb-1 block">{t("newItem.priceCol")}</Label>
            <div className="relative">
              <Input
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={t("newItem.pleaseEnter")}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                R$
              </span>
            </div>
          </div>

          <div>
            <Label className="mb-1 block">{t("menuList.stock")}</Label>
            <RadioGroup value={stock} onValueChange={setStock} className="flex gap-6">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="unlimited" id="sub-stock-unlimited" />
                <Label htmlFor="sub-stock-unlimited">{t("newItem.unlimited")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <RadioGroupItem value="custom" id="sub-stock-custom" />
                <Label htmlFor="sub-stock-custom">{t("newItem.custom")}</Label>
              </div>
            </RadioGroup>
            {stock === "custom" && (
              <Input
                type="number"
                className="mt-2 w-32"
                value={stockCount}
                onChange={(e) => setStockCount(e.target.value)}
                placeholder={t("newItem.number")}
              />
            )}
          </div>

          <div>
            <Label className="mb-1 block">{t("menuList.status")}</Label>
            <Switch checked={status} onCheckedChange={setStatus} />
            <span className="ml-2 text-sm text-muted-foreground">
              {status ? t("menuList.active") : t("menuList.inactive")}
            </span>
          </div>

          <div className="flex gap-3 pt-4">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={handleSave}>
              {t("newItem.save")}
            </Button>
            <Button variant="outline" onClick={() => navigate("/")}>
              {t("newItem.discard")}
            </Button>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default SubItemEditPage;
