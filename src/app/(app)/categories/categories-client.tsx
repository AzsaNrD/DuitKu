"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CategoryIcon, CATEGORY_ICONS } from "@/components/category-icon";
import { ColorPicker } from "@/components/color-picker";
import {
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/actions/categories";
import { categorySchema, type CategoryInput } from "@/lib/zod-schemas";
import type { Category, CategoryType } from "@/db/schema";
import { cn } from "@/lib/utils";

export function CategoriesClient({ categories }: { categories: Category[] }) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState<Category | null>(null);
  const [formType, setFormType] = useState<CategoryType>("expense");

  const expenseCategories = categories.filter((c) => c.type === "expense");
  const incomeCategories = categories.filter((c) => c.type === "income");

  function openCreate(type: CategoryType) {
    setEditing(null);
    setFormType(type);
    setOpen(true);
  }

  function openEdit(category: Category) {
    setEditing(category);
    setFormType(category.type);
    setOpen(true);
  }

  async function handleDelete() {
    if (!deleting) return;
    const res = await deleteCategory(deleting.id);
    if (res.success) toast.success("Kategori dihapus");
    setDeleting(null);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight">Kategori</h1>
          <p className="text-sm text-muted-foreground">
            Kelompokkan transaksimu supaya mudah dianalisis
          </p>
        </div>
      </div>

      <Tabs defaultValue="expense">
        <div className="flex items-center justify-between gap-2">
          <TabsList>
            <TabsTrigger value="expense">
              Pengeluaran ({expenseCategories.length})
            </TabsTrigger>
            <TabsTrigger value="income">
              Pemasukan ({incomeCategories.length})
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="expense" className="mt-4 space-y-4">
          <Button onClick={() => openCreate("expense")}>
            <Plus /> Tambah Kategori Pengeluaran
          </Button>
          <CategoryList
            items={expenseCategories}
            onEdit={openEdit}
            onDelete={setDeleting}
          />
        </TabsContent>
        <TabsContent value="income" className="mt-4 space-y-4">
          <Button onClick={() => openCreate("income")}>
            <Plus /> Tambah Kategori Pemasukan
          </Button>
          <CategoryList
            items={incomeCategories}
            onEdit={openEdit}
            onDelete={setDeleting}
          />
        </TabsContent>
      </Tabs>

      {open && (
        <CategoryFormDialog
          open={open}
          onOpenChange={setOpen}
          editing={editing}
          defaultType={formType}
        />
      )}

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hapus kategori?</DialogTitle>
            <DialogDescription>
              Kategori &quot;{deleting?.name}&quot; akan dihapus. Transaksi yang
              memakai kategori ini tidak ikut terhapus, tetapi menjadi tanpa
              kategori.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Batal
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryList({
  items,
  onEdit,
  onDelete,
}: {
  items: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}) {
  if (items.length === 0) {
    return (
      <Card>
        <CardContent>
          <EmptyState
            compact
            icon={Tags}
            title="Belum ada kategori"
            description="Buat kategori untuk mengelompokkan transaksimu."
          />
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {items.map((category) => (
        <Card
          key={category.id}
          className="transition-all hover:-translate-y-0.5 hover:shadow-md"
        >
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-sm"
                style={{ backgroundColor: category.color }}
              >
                <CategoryIcon icon={category.icon} className="h-4 w-4" />
              </span>
              <span className="font-medium">{category.name}</span>
            </div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onEdit(category)}
              >
                <Pencil className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onDelete(category)}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function CategoryFormDialog({
  open,
  onOpenChange,
  editing,
  defaultType,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: Category | null;
  defaultType: CategoryType;
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: editing
      ? {
          name: editing.name,
          type: editing.type,
          icon: editing.icon,
          color: editing.color,
        }
      : { name: "", type: defaultType, icon: "circle", color: "#6366f1" },
  });

  async function onSubmit(data: CategoryInput) {
    const res = editing
      ? await updateCategory(editing.id, data)
      : await createCategory(data);
    if (res.error) {
      toast.error(res.error);
      return;
    }
    toast.success(editing ? "Kategori diperbarui" : "Kategori ditambahkan");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editing ? "Edit Kategori" : "Tambah Kategori"}
          </DialogTitle>
          <DialogDescription>
            {defaultType === "expense"
              ? "Kategori untuk pengeluaran"
              : "Kategori untuk pemasukan"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("type")} />
          <div className="space-y-2">
            <Label htmlFor="category-name">Nama</Label>
            <Input
              id="category-name"
              placeholder="cth: Makanan, Parkir"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Ikon</Label>
            <Controller
              control={control}
              name="icon"
              render={({ field }) => (
                <div className="grid grid-cols-8 gap-1.5">
                  {Object.keys(CATEGORY_ICONS).map((iconName) => (
                    <button
                      key={iconName}
                      type="button"
                      onClick={() => field.onChange(iconName)}
                      className={cn(
                        "flex h-9 w-9 items-center justify-center rounded-lg border transition-colors",
                        field.value === iconName
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border hover:bg-accent"
                      )}
                    >
                      <CategoryIcon icon={iconName} className="h-4 w-4" />
                    </button>
                  ))}
                </div>
              )}
            />
          </div>
          <div className="space-y-2">
            <Label>Warna</Label>
            <Controller
              control={control}
              name="color"
              render={({ field }) => (
                <ColorPicker value={field.value} onChange={field.onChange} />
              )}
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Menyimpan..." : "Simpan"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
