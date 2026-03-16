import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import AdminLayout from "@/components/AdminLayout";
import { ArrowLeft, ImagePlus, Plus, X } from "lucide-react";
import ImageUploadDialog from "@/components/ImageUploadDialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useMenu } from "@/contexts/MenuContext";
import { toast } from "@/hooks/use-toast";

const allergens = [
  "Diary",
  "Eggs",
  "Fish",
  "Diary",
  "Eggs",
  "Fish",
  "Diary",
  "Eggs",
  "Fish",
  "Diary",
  "Eggs",
  "Fish",
];

const DishFormPage = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { itemId } = useParams<{ itemId?: string }>();
  const { categories, addItem, updateItem, getItemById } = useMenu();

  const isEdit = !!itemId;
  const existingData = isEdit ? getItemById(itemId) : null;

  const [itemType, setItemType] = useState<"items" | "combo">("items");
  const [itemName, setItemName] = useState("");
  const [pdvCode, setPdvCode] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState<string>("");
  const [deliveryEnabled, setDeliveryEnabled] = useState(true);
  const [deliveryPrice, setDeliveryPrice] = useState("");
  const [pickupEnabled, setPickupEnabled] = useState(false);
  const [pickupPrice, setPickupPrice] = useState("");
  const [didiEnabled, setDidiEnabled] = useState(false);
  const [stockType, setStockType] = useState("unlimited");
  const [stockCount, setStockCount] = useState("");
  const [canSoldSeparately, setCanSoldSeparately] = useState("yes");
  const [containsAlcohol, setContainsAlcohol] = useState("no");
  const [saleTimeType, setSaleTimeType] = useState("weekly");
  const [selectedAllergens, setSelectedAllergens] = useState<number[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [imageDialogOpen, setImageDialogOpen] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  useEffect(() => {
    if (existingData) {
      const { item, categoryIndex } = existingData;
      setItemType(item.itemType || "items");
      setItemName(item.title);
      setPdvCode(item.pdvCode || "");
      setDescription(item.description || "");
      setSelectedCategoryIdx(String(categoryIndex));
      setDeliveryEnabled(true);
      setDeliveryPrice(item.deliveryPrice.replace("R$", ""));
      setPickupPrice(item.pickupPrice.replace("R$", ""));
      setPickupEnabled(item.pickupPrice !== "");
      setStockType(item.stock === "Unlimited" ? "unlimited" : "custom");
      setStockCount(item.stock === "Unlimited" ? "" : item.stock);
      setCanSoldSeparately(item.notSoldIndependently ? "no" : "yes");
    }
  }, [itemId]);

  const toggleAllergen = (idx: number) => {
    setSelectedAllergens((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx],
    );
  };

  const handleSubmit = () => {
    setSubmitted(true);
    if (!itemName.trim() || !selectedCategoryIdx || !deliveryPrice.trim())
      return;

    const catIdx = Number(selectedCategoryIdx);
    const formattedDeliveryPrice = `R$${deliveryPrice}`;
    const formattedPickupPrice =
      pickupEnabled && pickupPrice ? `R$${pickupPrice}` : formattedDeliveryPrice;
    const stockValue =
      stockType === "unlimited" ? "Unlimited" : stockCount || "0";

    if (isEdit && existingData) {
      updateItem(itemId, {
        title: itemName.trim(),
        itemType,
        pdvCode,
        description,
        deliveryPrice: formattedDeliveryPrice,
        pickupPrice: formattedPickupPrice,
        stock: stockValue,
        notSoldIndependently: canSoldSeparately === "no",
      });
      toast({ title: t("newItem.itemUpdated") });
    } else {
      const newId = `${catIdx}-${Date.now()}`;
      addItem(catIdx, {
        id: newId,
        title: itemName.trim(),
        image: itemType === "combo" ? "🍱" : "🍽️",
        tags: [],
        deliveryPrice: formattedDeliveryPrice,
        pickupPrice: formattedPickupPrice,
        stock: stockValue,
        status: true,
        addOns: [],
        itemType,
        pdvCode,
        description,
        notSoldIndependently: canSoldSeparately === "no",
      });
      toast({ title: t("newItem.itemCreated") });
    }
    navigate("/");
  };

  const [activeTab, setActiveTab] =
    useState<"basic" | "modifications" | "sales">("basic");
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const basicInfoRef = useRef<HTMLDivElement>(null);
  const modificationsRef = useRef<HTMLDivElement>(null);
  const salesInfoRef = useRef<HTMLDivElement>(null);
  const isScrollingRef = useRef(false);

  const scrollToSection = (section: "basic" | "modifications" | "sales") => {
    setActiveTab(section);
    isScrollingRef.current = true;
    const refMap = {
      basic: basicInfoRef,
      modifications: modificationsRef,
      sales: salesInfoRef,
    };
    const target = refMap[section].current;
    const container = scrollContainerRef.current?.closest("main");
    if (target && container) {
      const containerRect = container.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const offset =
        targetRect.top - containerRect.top + container.scrollTop - 110;
      container.scrollTo({ top: offset, behavior: "smooth" });
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 600);
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
    const modsTop =
      modificationsRef.current?.getBoundingClientRect().top ?? Infinity;
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

  return (
    <AdminLayout>
      <div className="sticky top-0 z-10 bg-background border-b border-border">
        <div className="px-6 pt-4 pb-0">
          <div className="mb-3 flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" />
              {t("newItem.back")}
            </button>
            <span className="text-muted-foreground">|</span>
            <span className="text-sm font-medium">
              {isEdit ? t("newItem.editItem") : t("newItem.newItem")}
            </span>
          </div>
          <div className="flex gap-6">
            <button
              onClick={() => scrollToSection("basic")}
              className={`pb-2 text-sm font-semibold transition-colors ${
                activeTab === "basic"
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("newItem.basicInfo")}
            </button>
            <button
              onClick={() => scrollToSection("modifications")}
              className={`pb-2 text-sm font-semibold transition-colors ${
                activeTab === "modifications"
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("newItem.modifications")}
            </button>
            <button
              onClick={() => scrollToSection("sales")}
              className={`pb-2 text-sm font-semibold transition-colors ${
                activeTab === "sales"
                  ? "border-b-2 border-foreground text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t("newItem.salesInfo")}
            </button>
          </div>
        </div>
      </div>

      <div ref={scrollContainerRef} className="p-6">
        <div className="mx-auto max-w-2xl space-y-6">
          <div ref={basicInfoRef} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t("newItem.itemType")}{" "}
                <span className="text-destructive">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setItemType("items")}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    itemType === "items"
                      ? "border-foreground"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {t("newItem.itemsType")}
                    </span>
                    <div
                      className={`h-5 w-5 rounded-full border-2 ${
                        itemType === "items"
                          ? "border-foreground bg-foreground"
                          : "border-border"
                      }`}
                    >
                      {itemType === "items" && (
                        <div className="m-0.5 h-3 w-3 rounded-full bg-card" />
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("newItem.itemsDesc")}
                  </p>
                </button>
                <button
                  onClick={() => setItemType("combo")}
                  className={`rounded-lg border-2 p-4 text-left transition-colors ${
                    itemType === "combo"
                      ? "border-foreground"
                      : "border-border hover:border-muted-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">
                      {t("newItem.comboType")}
                    </span>
                    <div
                      className={`h-5 w-5 rounded-full border-2 ${
                        itemType === "combo"
                          ? "border-foreground bg-foreground"
                          : "border-border"
                      }`}
                    >
                      {itemType === "combo" && (
                        <div className="m-0.5 h-3 w-3 rounded-full bg-card" />
                      )}
                    </div>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {t("newItem.comboDesc")}
                  </p>
                </button>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("newItem.itemName")}{" "}
                <span className="text-destructive">*</span>
              </label>
              <div className="relative">
                <Input
                  placeholder={t("newItem.pleaseEnter")}
                  maxLength={50}
                  value={itemName}
                  onChange={(e) => setItemName(e.target.value)}
                  className={
                    submitted && !itemName.trim()
                      ? "border-destructive focus-visible:ring-destructive"
                      : ""
                  }
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {itemName.length}/50
                </span>
              </div>
              {submitted && !itemName.trim() && (
                <p className="mt-1 text-xs text-destructive">
                  {t("newItem.itemNameRequired")}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("newItem.pdvCode")}
              </label>
              <div className="relative">
                <Input
                  placeholder={t("newItem.pleaseEnter")}
                  maxLength={50}
                  value={pdvCode}
                  onChange={(e) => setPdvCode(e.target.value)}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {pdvCode.length}/50
                </span>
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("newItem.itemPicture")}
              </label>
              <p className="mb-2 text-xs text-muted-foreground">
                {t("newItem.imageHelp")}{" "}
                <span className="cursor-pointer underline">
                  {t("newItem.viewPhotoGuide")}
                </span>
              </p>
              <p className="mb-3 text-xs text-muted-foreground">
                {t("newItem.fileRequirements")}
              </p>
              <div className="flex items-start gap-4">
                {uploadedImage ? (
                  <div className="relative h-28 w-28 rounded-lg overflow-hidden border border-border">
                    <img
                      src={uploadedImage}
                      alt="Item"
                      className="h-full w-full object-cover"
                    />
                    <button
                      onClick={() => setUploadedImage(null)}
                      className="absolute top-1 right-1 h-5 w-5 rounded-full bg-foreground/70 flex items-center justify-center hover:bg-foreground/90"
                    >
                      <X className="h-3 w-3 text-background" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => setImageDialogOpen(true)}
                    className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-secondary hover:border-muted-foreground transition-colors"
                  >
                    <ImagePlus className="mb-1 h-8 w-8 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {t("newItem.addImage")}
                    </span>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setImageDialogOpen(true)}
                  >
                    {t("newItem.upload")}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-muted-foreground"
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
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("newItem.description")}
              </label>
              <Textarea
                placeholder={t("newItem.descriptionPlaceholder")}
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("newItem.storeDefinedCategory")}{" "}
                <span className="text-destructive">*</span> ℹ
              </label>
              <Select
                value={selectedCategoryIdx}
                onValueChange={setSelectedCategoryIdx}
              >
                <SelectTrigger
                  className={
                    submitted && !selectedCategoryIdx
                      ? "border-destructive focus:ring-destructive"
                      : ""
                  }
                >
                  <SelectValue placeholder={t("newItem.pleaseSelect")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat, idx) => (
                    <SelectItem key={idx} value={String(idx)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {submitted && !selectedCategoryIdx && (
                <p className="mt-1 text-xs text-destructive">
                  {t("newItem.categoryRequired")}
                </p>
              )}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("newItem.itemClassification")} ℹ
              </label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={t("newItem.pleaseSelect")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="food">{t("newItem.food")}</SelectItem>
                  <SelectItem value="drink">{t("newItem.drink")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("newItem.healthyFoodType")}
              </label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={t("newItem.pleaseSelect")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t("newItem.none")}</SelectItem>
                  <SelectItem value="low-cal">
                    {t("newItem.lowCalorie")}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("newItem.vegan")}
              </label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder={t("newItem.pleaseSelect")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="yes">{t("newItem.yes")}</SelectItem>
                  <SelectItem value="no">{t("newItem.no")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                {t("newItem.allergens")}
              </label>
              <div className="flex flex-wrap gap-2">
                {allergens.map((a, idx) => (
                  <Badge
                    key={idx}
                    variant={
                      selectedAllergens.includes(idx) ? "default" : "outline"
                    }
                    className={`cursor-pointer px-3 py-1 text-xs ${
                      selectedAllergens.includes(idx)
                        ? "bg-foreground text-card hover:bg-foreground/80"
                        : "hover:bg-secondary"
                    }`}
                    onClick={() => toggleAllergen(idx)}
                  >
                    {a}
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("newItem.containsAlcohol")}
              </label>
              <p className="mb-2 text-xs text-muted-foreground">
                {t("newItem.alcoholWarning")}
              </p>
              <RadioGroup
                value={containsAlcohol}
                onValueChange={setContainsAlcohol}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="alc-no" />
                  <Label htmlFor="alc-no">{t("newItem.no")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="alc-yes" />
                  <Label htmlFor="alc-yes">{t("newItem.yes")}</Label>
                </div>
              </RadioGroup>
            </div>
          </div>

          <div ref={modificationsRef} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-medium">
                {t("newItem.modificationGroup")}
              </label>
              <Button variant="outline" className="w-full gap-1">
                <Plus className="h-4 w-4" />
                {t("newItem.addGroup")}
              </Button>
            </div>
          </div>

          <div ref={salesInfoRef} className="space-y-6">
            <div>
              <label className="mb-1 block text-sm font-medium">
                {t("newItem.price")}{" "}
                <span className="text-destructive">*</span>
              </label>
              <p className="mb-3 text-xs text-muted-foreground">
                {t("newItem.priceNote")}
              </p>

              <div className="mb-3 rounded-lg border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div>
                    <span className="text-sm font-semibold">
                      {t("newItem.deliveryTitle")}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      {t("newItem.originalPrice")}
                    </p>
                  </div>
                  <Switch
                    checked={deliveryEnabled}
                    onCheckedChange={setDeliveryEnabled}
                  />
                </div>
                <div className="relative">
                  <Input
                    placeholder={t("newItem.pleaseEnter")}
                    value={deliveryPrice}
                    onChange={(e) => setDeliveryPrice(e.target.value)}
                    className={
                      submitted && !deliveryPrice.trim()
                        ? "border-destructive focus-visible:ring-destructive"
                        : ""
                    }
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                    R$
                  </span>
                </div>
                {submitted && !deliveryPrice.trim() && (
                  <p className="mt-1 text-xs text-destructive">
                    {t("newItem.deliveryPriceRequired")}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold">
                        {t("newItem.pickUpTitle")}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {t("newItem.priceLabel")}
                      </p>
                    </div>
                    <Switch
                      checked={pickupEnabled}
                      onCheckedChange={setPickupEnabled}
                    />
                  </div>
                  <div className="relative">
                    <Input
                      placeholder={t("newItem.pleaseEnter")}
                      disabled={!pickupEnabled}
                      value={pickupPrice}
                      onChange={(e) => setPickupPrice(e.target.value)}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      R$
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center justify-between">
                    <div>
                      <span className="text-sm font-semibold">
                        {t("newItem.didiTitle")}
                      </span>
                      <p className="text-xs text-muted-foreground">
                        {t("newItem.priceLabel")}
                      </p>
                    </div>
                    <Switch
                      checked={didiEnabled}
                      onCheckedChange={setDidiEnabled}
                    />
                  </div>
                  <div className="relative">
                    <Input
                      placeholder={t("newItem.pleaseEnter")}
                      disabled={!didiEnabled}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
                      R$
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                {t("newItem.stocking")}
              </label>
              <RadioGroup
                value={stockType}
                onValueChange={setStockType}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="unlimited" id="stock-unlimited" />
                  <Label htmlFor="stock-unlimited">
                    {t("newItem.unlimited")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="custom" id="stock-custom" />
                  <Label htmlFor="stock-custom">
                    {t("newItem.custom")}
                  </Label>
                </div>
              </RadioGroup>
              {stockType === "custom" && (
                <Input
                  className="mt-2 w-32"
                  placeholder={t("newItem.number")}
                  type="number"
                  value={stockCount}
                  onChange={(e) => setStockCount(e.target.value)}
                />
              )}
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                {t("newItem.canBeSoldSeparately")}
              </label>
              <RadioGroup
                value={canSoldSeparately}
                onValueChange={setCanSoldSeparately}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="yes" id="sep-yes" />
                  <Label htmlFor="sep-yes">{t("newItem.yes")}</Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="no" id="sep-no" />
                  <Label htmlFor="sep-no">{t("newItem.no")}</Label>
                </div>
              </RadioGroup>
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium">
                {t("newItem.saleTime")}
              </label>
              <RadioGroup
                value={saleTimeType}
                onValueChange={setSaleTimeType}
                className="flex gap-6"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="weekly" id="time-weekly" />
                  <Label htmlFor="time-weekly">
                    {t("newItem.weeklyCycle")}
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="specific" id="time-specific" />
                  <Label htmlFor="time-specific">
                    {t("newItem.specificTime")}
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
        </div>
      </div>

      <div className="sticky bottom-0 border-t border-border bg-background px-6 py-4">
        <div className="mx-auto flex max-w-2xl gap-3">
          <Button
            onClick={handleSubmit}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
          >
            {isEdit ? t("newItem.save") : t("newItem.submit")}
          </Button>
          <Button variant="outline" onClick={() => navigate("/")}>
            {t("newItem.discard")}
          </Button>
        </div>
      </div>
    </AdminLayout>
  );
};

export default DishFormPage;


