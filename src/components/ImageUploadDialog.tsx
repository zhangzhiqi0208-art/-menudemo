import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import burgerJpg from "@/assets/系统内置/burger.jpg";
import comboJpg from "@/assets/系统内置/combo.jpg";

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
  /** 传入时直接进入第二步（确认页），用于编辑已有图片 */
  initialImageUrl?: string;
}

const BUILTIN_IMAGE_URLS = [burgerJpg, comboJpg];

const ImageUploadDialog = ({ open, onOpenChange, onImageSelected, initialImageUrl }: ImageUploadDialogProps) => {
  const { t } = useTranslation();
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [activeIndex, setActiveIndex] = useState(-1);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const checkedMarkSrc = "/src/assets/已勾选图片.png";
  const uploadIconSrc = "/src/assets/上传图片.png";

  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const blobToImage = (blob: Blob, name: string, type = "image/jpeg") => {
      const file = new File([blob], name, { type: blob.type || type });
      return { file, url: URL.createObjectURL(blob), confirmed: false, zoom: 1, rotation: 0 } as UploadedImage;
    };
    const loadBuiltIn = () =>
      Promise.all(
        BUILTIN_IMAGE_URLS.map((src) =>
          fetch(src, { signal: ctrl.signal })
            .then((r) => r.blob())
            .then((blob) => blobToImage(blob, src.split("/").pop() || "image.jpg"))
            .catch(() => null)
        )
      ).then((results) => results.filter((r): r is UploadedImage => r !== null));
    const loadInitial = initialImageUrl
      ? fetch(initialImageUrl, { signal: ctrl.signal })
          .then((r) => r.blob())
          .then((blob) => ({ blob, img: blobToImage(blob, "image.png", "image/png") }))
          .catch(() => null)
      : Promise.resolve(null);

    Promise.all([loadBuiltIn(), loadInitial]).then(([builtIn, initialResult]) => {
      if (!builtIn.length) {
        const initial = initialResult ? [initialResult.img] : [];
        setImages(initial);
        setActiveIndex(initial.length > 0 ? 0 : -1);
        return;
      }
      if (!initialResult) {
        setImages(builtIn);
        setActiveIndex(-1);
        return;
      }
      const { blob: initialBlob, img: initialImg } = initialResult;
      const matchIdx = builtIn.findIndex((b) => b.file.size === initialBlob.size);
      if (matchIdx >= 0) {
        const all = builtIn;
        setImages(all);
        setActiveIndex(matchIdx);
      } else {
        const all = [initialImg, ...builtIn];
        setImages(all);
        setActiveIndex(0);
      }
    });
    return () => ctrl.abort();
  }, [open, initialImageUrl]);
  const uncheckedMarkSrc = "/src/assets/未勾选图片.png";

  const handleFilesSelect = (files: FileList) => {
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    const newImages: UploadedImage[] = [];
    Array.from(files).forEach((file) => {
      if (validTypes.includes(file.type) && file.size <= 10 * 1024 * 1024) {
        newImages.push({ file, url: URL.createObjectURL(file), confirmed: false, zoom: 1, rotation: 0 });
      }
    });
    if (newImages.length > 0) {
      setImages((prev) => {
        const next = [...prev, ...newImages];
        setActiveIndex(prev.length);
        return next;
      });
    }
  };

  const handleConfirmSelection = () => {
    if (activeIndex < 0) return;
    const selected = images[activeIndex];
    if (!selected) return;
    onImageSelected(selected.file, selected.url);
    setImages([]);
    setActiveIndex(0);
    onOpenChange(false);
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      setImages([]);
      setActiveIndex(-1);
    }
    onOpenChange(isOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[680px] p-0 gap-0">
        <DialogHeader className="px-6 pt-5 pb-0">
          <DialogTitle className="text-base font-semibold">{t("imageUpload.selectImage")}</DialogTitle>
        </DialogHeader>

        <div className="px-6 py-5">
          <div className="space-y-4">
            <div>
              <Button
                onClick={() => fileInputRef.current?.click()}
                className="bg-[hsl(48,96%,53%)] hover:bg-[hsl(48,96%,45%)] text-foreground font-medium px-6"
              >
                <img src={uploadIconSrc} alt="" className="h-4 w-4 mr-2" />
                上传图片
              </Button>
            </div>

            <div className="grid grid-cols-5 gap-3">
              {images.map((img, idx) => (
                <button
                  key={idx}
                  onClick={() => setActiveIndex(idx)}
                  className={`relative aspect-square w-full overflow-hidden rounded-lg border-2 transition-colors ${idx === activeIndex ? "border-[hsl(48,96%,53%)]" : "border-transparent"}`}
                >
                  <img src={img.url} alt="" className="h-full w-full object-cover" />
                  <img
                    src={idx === activeIndex ? checkedMarkSrc : uncheckedMarkSrc}
                    alt=""
                    className="absolute right-2 top-2 h-5 w-5"
                  />
                </button>
              ))}
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border pt-4">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                {t("newItem.cancel")}
              </Button>
              <Button
                onClick={handleConfirmSelection}
                disabled={images.length === 0 || activeIndex < 0}
                className="bg-[hsl(48,96%,53%)] hover:bg-[hsl(48,96%,45%)] text-foreground"
              >
                {t("menuList.ok")}
              </Button>
            </div>
          </div>
        </div>

        {/* Always keep the hidden file input available so确认页按钮也能触发上传 */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          multiple
          className="hidden"
          onChange={(e) => {
            if (e.target.files && e.target.files.length > 0) handleFilesSelect(e.target.files);
            e.target.value = "";
          }}
        />
      </DialogContent>
    </Dialog>
  );
};

export default ImageUploadDialog;
