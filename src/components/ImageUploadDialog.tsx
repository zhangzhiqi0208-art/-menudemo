import { useState, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, Search, SearchIcon, Plus, Minus, RotateCw, Undo2, CheckCircle2, Trash2 } from "lucide-react";

interface UploadedImage {
  file: File;
  url: string;
  confirmed: boolean;
  zoom: number;
  rotation: number;
}

interface ImageUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImageSelected: (file: File, previewUrl: string) => void;
}

const ImageUploadDialog = ({ open, onOpenChange, onImageSelected }: ImageUploadDialogProps) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<"store" | "gallery">("store");
  const [isDragging, setIsDragging] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFilesSelect = (files: FileList) => {
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const newImages: UploadedImage[] = [];
    Array.from(files).forEach((file) => {
      if (validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024) {
        newImages.push({ file, url: URL.createObjectURL(file), confirmed: false, zoom: 1, rotation: 0 });
      }
    });
    if (newImages.length > 0) {
      setImages((prev) => [...prev, ...newImages]);
      if (images.length === 0) setActiveIndex(0);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) handleFilesSelect(e.dataTransfer.files);
  }, [images.length]);

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); }, []);
  const handleDragLeave = useCallback(() => { setIsDragging(false); }, []);

  const toggleConfirm = (index: number) => {
    setImages((prev) => prev.map((img, i) => (i === index ? { ...img, confirmed: !img.confirmed } : img)));
  };

  const deleteImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    if (activeIndex >= images.length - 1 && activeIndex > 0) setActiveIndex(activeIndex - 1);
  };

  const updateZoom = (delta: number) => {
    setImages((prev) => prev.map((img, i) => i === activeIndex ? { ...img, zoom: Math.max(0.5, Math.min(3, img.zoom + delta)) } : img));
  };

  const rotate90 = () => {
    setImages((prev) => prev.map((img, i) => i === activeIndex ? { ...img, rotation: (img.rotation + 90) % 360 } : img));
  };

  const resetTransform = () => {
    setImages((prev) => prev.map((img, i) => i === activeIndex ? { ...img, zoom: 1, rotation: 0 } : img));
  };

  const goNext = () => { if (activeIndex < images.length - 1) setActiveIndex(activeIndex + 1); };
  const goPrev = () => { if (activeIndex > 0) setActiveIndex(activeIndex - 1); };

  const confirmedCount = images.filter((img) => img.confirmed).length;

  const handleSubmitAll = () => {
    const confirmed = images.filter((img) => img.confirmed);
    if (confirmed.length > 0) onImageSelected(confirmed[0].file, confirmed[0].url);
    setImages([]);
    setActiveIndex(0);
    onOpenChange(false);
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) { setImages([]); setActiveIndex(0); }
    onOpenChange(open);
  };

  const currentImage = images[activeIndex];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[680px] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="text-base font-semibold">{t("imageUpload.selectImage")}</DialogTitle>
        </DialogHeader>

        <div className="px-6 mt-3 border-b border-border">
          <div className="flex gap-6">
            <button
              onClick={() => setActiveTab("store")}
              className={`pb-2 text-sm font-medium transition-colors ${activeTab === "store" ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("imageUpload.storePhotos")}
            </button>
            <button
              onClick={() => setActiveTab("gallery")}
              className={`pb-2 text-sm font-medium transition-colors ${activeTab === "gallery" ? "border-b-2 border-foreground text-foreground" : "text-muted-foreground hover:text-foreground"}`}
            >
              {t("imageUpload.platformGallery")}
            </button>
          </div>
        </div>

        <div className="px-6 py-5">
          {activeTab === "store" ? (
            images.length === 0 ? (
              <div
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-16 transition-colors ${isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`}
              >
                <Button onClick={() => fileInputRef.current?.click()} className="bg-[hsl(48,96%,53%)] hover:bg-[hsl(48,96%,45%)] text-foreground font-medium px-6">
                  <Upload className="h-4 w-4 mr-2" />
                  {t("imageUpload.uploadFromDevice")}
                </Button>
                <p className="mt-3 text-xs text-muted-foreground">{t("imageUpload.dragAndDrop")}</p>
                <p className="mt-4 text-xs text-muted-foreground text-center px-8">{t("imageUpload.imageRequirements")}</p>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/gif,image/webp" multiple className="hidden" onChange={(e) => { if (e.target.files && e.target.files.length > 0) handleFilesSelect(e.target.files); e.target.value = ""; }} />
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex gap-2 overflow-x-auto pb-2">
                  {images.map((img, idx) => (
                    <div key={idx} onClick={() => setActiveIndex(idx)} className={`relative flex-shrink-0 h-16 w-16 rounded cursor-pointer overflow-hidden border-2 transition-colors ${idx === activeIndex ? "border-[hsl(48,96%,53%)]" : "border-transparent"}`}>
                      <img src={img.url} alt="" className="h-full w-full object-cover" />
                      {img.confirmed && <div className="absolute bottom-0.5 right-0.5"><CheckCircle2 className="h-4 w-4 text-green-500 fill-green-500" /></div>}
                      {idx === activeIndex && (
                        <button onClick={(e) => { e.stopPropagation(); deleteImage(idx); }} className="absolute top-0.5 right-0.5 h-4 w-4 rounded-sm bg-foreground/60 flex items-center justify-center hover:bg-foreground/80">
                          <Trash2 className="h-2.5 w-2.5 text-background" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                {currentImage && (
                  <>
                    <div className="relative bg-muted/50 rounded-lg overflow-hidden flex items-center justify-center" style={{ height: 320 }}>
                      <img src={currentImage.url} alt="" className="max-h-full max-w-full object-contain transition-transform duration-200" style={{ transform: `scale(${currentImage.zoom}) rotate(${currentImage.rotation}deg)` }} />
                      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-0 bg-foreground/70 rounded-full">
                        <button onClick={() => updateZoom(0.2)} className="h-8 w-8 flex items-center justify-center text-background hover:bg-foreground/90 rounded-l-full"><Plus className="h-4 w-4" /></button>
                        <button onClick={() => updateZoom(-0.2)} className="h-8 w-8 flex items-center justify-center text-background hover:bg-foreground/90 rounded-r-full"><Minus className="h-4 w-4" /></button>
                      </div>
                    </div>

                    <div className="flex items-center justify-center gap-6">
                      <button onClick={rotate90} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><RotateCw className="h-4 w-4" />{t("imageUpload.rotate90")}</button>
                      <button onClick={resetTransform} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><Undo2 className="h-4 w-4" />{t("imageUpload.reset")}</button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 text-green-500 fill-green-500" />
                        <span className="text-sm text-muted-foreground">{confirmedCount}/{images.length} {t("imageUpload.confirmed")}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button variant="outline" size="sm" onClick={goPrev} disabled={activeIndex === 0}>{t("imageUpload.previous")}</Button>
                        <Button size="sm" onClick={() => { toggleConfirm(activeIndex); if (!currentImage.confirmed && activeIndex < images.length - 1) goNext(); }} className="bg-[hsl(48,96%,53%)] hover:bg-[hsl(48,96%,45%)] text-foreground">
                          {currentImage.confirmed ? t("imageUpload.unconfirm") : t("imageUpload.next")}
                        </Button>
                        <Button variant="outline" size="sm" onClick={handleSubmitAll} disabled={confirmedCount === 0} className="border-[hsl(48,96%,53%)] text-[hsl(48,96%,40%)] hover:bg-[hsl(48,96%,95%)]">
                          {t("imageUpload.submitAll")}
                        </Button>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )
          ) : (
            <div>
              <div className="relative mb-4 max-w-[260px]">
                <Input placeholder={t("imageUpload.pleaseEnter")} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pr-9" />
                <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              <div className="flex flex-col items-center justify-center py-16">
                <div className="relative mb-3">
                  <div className="h-16 w-14 rounded bg-muted flex items-center justify-start pl-2 pt-3 flex-col gap-1">
                    <div className="h-1 w-8 rounded bg-muted-foreground/30" />
                    <div className="h-1 w-6 rounded bg-muted-foreground/30" />
                  </div>
                  <div className="absolute -bottom-1 -right-2 h-7 w-7 rounded-full bg-[hsl(48,96%,53%)] flex items-center justify-center">
                    <Search className="h-3.5 w-3.5 text-foreground" />
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">{t("imageUpload.noResults")}</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImageUploadDialog;
