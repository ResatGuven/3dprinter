// app/admin/products/[id]/edit/page.tsx  (also used for /new via route)
// components/admin/ProductForm.tsx

"use client";

import { useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import {
  Upload,
  X,
  GripVertical,
  Star,
  StarOff,
  Loader2,
  Save,
  ArrowLeft,
  ImagePlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────
const productSchema = z.object({
  name: z.string().min(2, "En az 2 karakter").max(120),
  description: z.string().min(10, "En az 10 karakter"),
  price: z.coerce.number().positive("Fiyat sıfırdan büyük olmalı"),
  stock: z.coerce.number().int().min(0),
  categoryId: z.string().min(1, "Kategori seçiniz"),
  filamentType: z.enum(["PLA", "PETG", "ABS", "TPU", "RESIN", "NYLON", "ASA"]),
  printTimeHours: z.coerce.number().positive().optional().nullable(),
  dimensionX: z.coerce.number().positive().optional().nullable(),
  dimensionY: z.coerce.number().positive().optional().nullable(),
  dimensionZ: z.coerce.number().positive().optional().nullable(),
  weight: z.coerce.number().positive().optional().nullable(),
  isActive: z.boolean().default(true),
});

type ProductFormValues = z.infer<typeof productSchema>;

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────
type UploadedImage = {
  id: string;
  url: string;
  publicId?: string;
  isPrimary: boolean;
  isUploading?: boolean;
  localPreview?: string; // blob URL for optimistic preview
};

type Category = { id: string; name: string };

type ProductFormProps = {
  initialData?: Partial<ProductFormValues> & {
    id?: string;
    images?: UploadedImage[];
  };
  categories: Category[];
};

// ─────────────────────────────────────────────
// Drag & Drop Image Upload Zone
// ─────────────────────────────────────────────
function ImageUploadZone({
  images,
  onAdd,
  onRemove,
  onSetPrimary,
}: {
  images: UploadedImage[];
  onAdd: (files: File[]) => void;
  onRemove: (id: string) => void;
  onSetPrimary: (id: string) => void;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const files = Array.from(e.dataTransfer.files).filter((f) =>
        f.type.startsWith("image/")
      );
      if (files.length) onAdd(files);
    },
    [onAdd]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length) onAdd(files);
    e.target.value = "";
  };

  return (
    <div className="space-y-4">
      {/* Drop zone */}
      <div
        className={cn(
          "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200",
          "hover:border-primary/60 hover:bg-primary/5",
          isDragging
            ? "border-primary bg-primary/10 scale-[1.01]"
            : "border-muted-foreground/25"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="flex flex-col items-center gap-3">
          <div className="p-3 rounded-full bg-muted">
            <ImagePlus className="h-6 w-6 text-muted-foreground" />
          </div>
          <div>
            <p className="font-medium text-sm">
              Görsel sürükleyip bırakın veya tıklayın
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              PNG, JPG, WebP — maks 10 MB — çoklu seçim desteklenir
            </p>
          </div>
          <Button type="button" variant="outline" size="sm">
            <Upload className="h-3.5 w-3.5 mr-1.5" />
            Dosya Seç
          </Button>
        </div>
      </div>

      {/* Preview grid */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img) => (
            <div
              key={img.id}
              className={cn(
                "relative group rounded-lg overflow-hidden border-2 transition-all",
                img.isPrimary ? "border-primary" : "border-transparent"
              )}
            >
              {/* Image */}
              <div className="aspect-square bg-muted">
                {img.isUploading ? (
                  <div className="h-full flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                  </div>
                ) : (
                  <img
                    src={img.localPreview ?? img.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                )}
              </div>

              {/* Primary badge */}
              {img.isPrimary && (
                <div className="absolute top-1.5 left-1.5">
                  <span className="text-[10px] font-semibold bg-primary text-primary-foreground rounded px-1.5 py-0.5">
                    Ana
                  </span>
                </div>
              )}

              {/* Hover overlay */}
              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                <button
                  type="button"
                  className="p-1.5 rounded-md bg-white/20 hover:bg-white/30 text-white transition-colors"
                  onClick={() => onSetPrimary(img.id)}
                  title="Ana görsel yap"
                >
                  {img.isPrimary ? (
                    <StarOff className="h-4 w-4" />
                  ) : (
                    <Star className="h-4 w-4" />
                  )}
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded-md bg-white/20 hover:bg-red-500/80 text-white transition-colors"
                  onClick={() => onRemove(img.id)}
                  title="Kaldır"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────
// Main Form Component
// ─────────────────────────────────────────────
export function ProductForm({ initialData, categories }: ProductFormProps) {
  const router = useRouter();
  const isEditing = Boolean(initialData?.id);

  const [images, setImages] = useState<UploadedImage[]>(
    initialData?.images ?? []
  );
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: initialData?.name ?? "",
      description: initialData?.description ?? "",
      price: initialData?.price ?? 0,
      stock: initialData?.stock ?? 0,
      categoryId: initialData?.categoryId ?? "",
      filamentType: initialData?.filamentType ?? "PLA",
      printTimeHours: initialData?.printTimeHours ?? null,
      dimensionX: initialData?.dimensionX ?? null,
      dimensionY: initialData?.dimensionY ?? null,
      dimensionZ: initialData?.dimensionZ ?? null,
      weight: initialData?.weight ?? null,
      isActive: initialData?.isActive ?? true,
    },
  });

  // ── Image handlers ──────────────────────────
  const handleAddImages = useCallback(async (files: File[]) => {
    // Optimistic: show local previews immediately
    const newImages: UploadedImage[] = files.map((file, i) => ({
      id: `temp-${Date.now()}-${i}`,
      url: "",
      localPreview: URL.createObjectURL(file),
      isPrimary: false,
      isUploading: true,
    }));

    setImages((prev) => {
      const updated = [...prev, ...newImages];
      // Auto-set first image as primary if none exists
      if (!updated.find((img) => img.isPrimary)) {
        updated[0].isPrimary = true;
      }
      return updated;
    });

    // Upload each file
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const tempId = newImages[i].id;

      try {
        const formData = new FormData();
        formData.append("file", file);

        const res = await fetch("/api/admin/upload", {
          method: "POST",
          body: formData,
        });

        if (!res.ok) throw new Error("Upload failed");
        const { url, publicId } = await res.json();

        setImages((prev) =>
          prev.map((img) =>
            img.id === tempId
              ? { ...img, url, publicId, isUploading: false }
              : img
          )
        );
      } catch {
        toast.error(`${file.name} yüklenirken hata oluştu.`);
        setImages((prev) => prev.filter((img) => img.id !== tempId));
      }
    }
  }, []);

  const handleRemoveImage = useCallback(
    async (id: string) => {
      const img = images.find((i) => i.id === id);
      if (!img) return;

      // If uploaded to Cloudinary, delete remotely
      if (img.publicId) {
        await fetch(`/api/admin/upload/${img.publicId}`, { method: "DELETE" });
      }

      setImages((prev) => {
        const filtered = prev.filter((i) => i.id !== id);
        // Re-assign primary if needed
        if (img.isPrimary && filtered.length > 0) {
          filtered[0].isPrimary = true;
        }
        return filtered;
      });
    },
    [images]
  );

  const handleSetPrimary = useCallback((id: string) => {
    setImages((prev) =>
      prev.map((img) => ({ ...img, isPrimary: img.id === id }))
    );
  }, []);

  // ── Submit ──────────────────────────────────
  const onSubmit = async (values: ProductFormValues) => {
    if (images.some((img) => img.isUploading)) {
      toast.warning("Lütfen görseller yüklenene kadar bekleyin.");
      return;
    }

    setIsSaving(true);
    try {
      const payload = {
        ...values,
        images: images.map((img) => ({
          url: img.url,
          publicId: img.publicId,
          isPrimary: img.isPrimary,
        })),
      };

      const url = isEditing
        ? `/api/admin/products/${initialData!.id}`
        : "/api/admin/products";

      const res = await fetch(url, {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message ?? "Kayıt başarısız");
      }

      toast.success(
        isEditing ? "Ürün başarıyla güncellendi." : "Ürün başarıyla eklendi."
      );
      router.push("/admin/products");
      router.refresh();
    } catch (err: unknown) {
      toast.error(
        err instanceof Error ? err.message : "Beklenmedik bir hata oluştu."
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
        {/* Page header */}
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold tracking-tight">
              {isEditing ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}
            </h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {isEditing
                ? "Mevcut ürünün bilgilerini güncelleyin."
                : "Yeni bir 3D baskı ürünü ekleyin."}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FormField
              control={form.control}
              name="isActive"
              render={({ field }) => (
                <FormItem className="flex items-center gap-2 space-y-0">
                  <FormLabel className="text-sm">
                    {field.value ? "Aktif" : "Pasif"}
                  </FormLabel>
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                </FormItem>
              )}
            />
            <Button type="submit" disabled={isSaving}>
              {isSaving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isEditing ? "Güncelle" : "Kaydet"}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left column: main info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic info card */}
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Temel Bilgiler
              </h2>

              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ürün Adı *</FormLabel>
                    <FormControl>
                      <Input placeholder="Örn: Dekoratif Vazo — Geometrik Seri" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Açıklama *</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Ürün hakkında detaylı bilgi..."
                        className="min-h-[120px] resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Filament özellikleri, kullanım alanı ve boyutlar hakkında
                      bilgi verin.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 3D Print specs */}
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                3D Baskı Özellikleri
              </h2>

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="filamentType"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Filament Tipi *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Seçiniz" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {["PLA", "PETG", "ABS", "TPU", "RESIN", "NYLON", "ASA"].map(
                            (f) => (
                              <SelectItem key={f} value={f}>
                                {f}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="printTimeHours"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Baskı Süresi (saat)</FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.5"
                          placeholder="Örn: 4.5"
                          {...field}
                          value={field.value ?? ""}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              {/* Dimensions */}
              <div>
                <FormLabel className="text-sm">Boyutlar (mm)</FormLabel>
                <div className="grid grid-cols-3 gap-3 mt-2">
                  {(["dimensionX", "dimensionY", "dimensionZ"] as const).map(
                    (dim) => (
                      <FormField
                        key={dim}
                        control={form.control}
                        name={dim}
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder={
                                  dim === "dimensionX"
                                    ? "Genişlik"
                                    : dim === "dimensionY"
                                    ? "Derinlik"
                                    : "Yükseklik"
                                }
                                {...field}
                                value={field.value ?? ""}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    )
                  )}
                </div>
              </div>

              <FormField
                control={form.control}
                name="weight"
                render={({ field }) => (
                  <FormItem className="max-w-xs">
                    <FormLabel>Ağırlık (gram)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="1"
                        placeholder="Örn: 250"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Images */}
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Ürün Görselleri
              </h2>
              <ImageUploadZone
                images={images}
                onAdd={handleAddImages}
                onRemove={handleRemoveImage}
                onSetPrimary={handleSetPrimary}
              />
            </div>
          </div>

          {/* Right column: pricing & category */}
          <div className="space-y-6">
            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Fiyat & Stok
              </h2>

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fiyat (₺) *</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-medium">
                          ₺
                        </span>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="pl-8"
                          placeholder="0.00"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="stock"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Stok Adedi *</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      0 girişi ürünü "Tükendi" olarak gösterir.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="rounded-xl border bg-card p-6 space-y-4">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">
                Kategori
              </h2>

              <FormField
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kategori *</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Kategori seçiniz" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </div>
        </div>
      </form>
    </Form>
  );
}
