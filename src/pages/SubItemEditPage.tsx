import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminLayout from "@/components/AdminLayout";
import { ArrowLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { useMenu } from "@/contexts/MenuContext";
import { toast } from "@/hooks/use-toast";

const SubItemEditPage = () => {
  const navigate = useNavigate();
  const { parentId, groupIdx, subIdx } = useParams<{
    parentId: string;
    groupIdx: string;
    subIdx: string;
  }>();
  const { t } = useTranslation();
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

  useEffect(() => {
    if (subItem) {
      setName(subItem.name);
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
  }, [subItem]);

  const handleSave = () => {
    setSubmitted(true);
    if (!name.trim()) return;

    if (!parentItem || group === undefined || subItem === undefined) return;

    const stockVal = stock === "unlimited" ? "999" : stockCount || "0";
    const formattedPrice = price.trim() ? `R$${price.trim()}` : "R$0.00";

    const newAddOns = (parentItem.addOns || []).map((g, gIdx) =>
      gIdx === Number(groupIdx)
        ? {
            ...g,
            items: g.items.map((s, sIdx) =>
              sIdx === Number(subIdx)
                ? {
                    ...s,
                    name: name.trim(),
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
        <div className="mb-6 flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {t("newItem.back")}
          </Button>
          <h1 className="text-lg font-semibold">
            {t("newItem.editSubItem")} · {subItem.name}
          </h1>
          <div className="w-16" />
        </div>

        <div className="mx-auto max-w-xl space-y-6">
          <p className="text-sm text-muted-foreground">
            {parentItem.title} → {group.name}
          </p>

          <div>
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
            <div className="flex gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={stock === "unlimited"}
                  onChange={() => setStock("unlimited")}
                />
                {t("newItem.unlimited")}
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  checked={stock === "custom"}
                  onChange={() => setStock("custom")}
                />
                {t("newItem.custom")}
              </label>
            </div>
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
            <Button className="bg-[hsl(48,96%,53%)] hover:bg-[hsl(48,96%,45%)] text-foreground" onClick={handleSave}>
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
