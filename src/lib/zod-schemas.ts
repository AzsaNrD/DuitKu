import { z } from "zod";

// Nominal uang dari AmountInput mengandung titik ribuan ("500.000") —
// buang titiknya dulu sebelum di-coerce ke number.
const stripThousands = (v: unknown) =>
  typeof v === "string" ? v.replaceAll(".", "") : v;

// Cast ke ZodType<number, number> supaya tipe form tetap `number`
// (runtime tetap menerima string berformat, sama seperti z.coerce).
const amountPositive = (message: string) =>
  z.preprocess(
    stripThousands,
    z.coerce.number<number>().int("Harus bilangan bulat").positive(message)
  ) as unknown as z.ZodType<number, number>;

const amountNonNegative = z.preprocess(
  stripThousands,
  z.coerce
    .number<number>()
    .int("Harus bilangan bulat")
    .min(0, "Tidak boleh negatif")
) as unknown as z.ZodType<number, number>;

export const loginSchema = z.object({
  email: z.email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi"),
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.email("Email tidak valid"),
  password: z.string().min(8, "Password minimal 8 karakter"),
});

export const walletSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(50),
  type: z.enum(["cash", "bank", "ewallet"]),
  initialBalance: amountNonNegative,
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Warna tidak valid"),
});

export const categorySchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(50),
  type: z.enum(["income", "expense"]),
  icon: z.string().min(1),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Warna tidak valid"),
});

export const transactionSchema = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    amount: amountPositive("Jumlah harus lebih dari 0"),
    walletId: z.string().min(1, "Pilih dompet"),
    categoryId: z.string().optional(),
    transferToWalletId: z.string().optional(),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
    note: z.string().max(255).optional(),
  })
  .refine((d) => d.type === "transfer" || !!d.categoryId, {
    message: "Pilih kategori",
    path: ["categoryId"],
  })
  .refine((d) => d.type !== "transfer" || !!d.transferToWalletId, {
    message: "Pilih dompet tujuan",
    path: ["transferToWalletId"],
  })
  .refine(
    (d) => d.type !== "transfer" || d.walletId !== d.transferToWalletId,
    {
      message: "Dompet asal dan tujuan tidak boleh sama",
      path: ["transferToWalletId"],
    }
  );

export const recurringSchema = z
  .object({
    type: z.enum(["income", "expense", "transfer"]),
    amount: amountPositive("Jumlah harus lebih dari 0"),
    walletId: z.string().min(1, "Pilih dompet"),
    categoryId: z.string().optional(),
    transferToWalletId: z.string().optional(),
    frequency: z.enum(["daily", "weekly", "monthly"]),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal tidak valid"),
    note: z.string().max(255).optional(),
  })
  .refine((d) => d.type === "transfer" || !!d.categoryId, {
    message: "Pilih kategori",
    path: ["categoryId"],
  })
  .refine((d) => d.type !== "transfer" || !!d.transferToWalletId, {
    message: "Pilih dompet tujuan",
    path: ["transferToWalletId"],
  })
  .refine(
    (d) => d.type !== "transfer" || d.walletId !== d.transferToWalletId,
    {
      message: "Dompet asal dan tujuan tidak boleh sama",
      path: ["transferToWalletId"],
    }
  );

export const adjustBalanceSchema = z.object({
  actualBalance: amountNonNegative,
  note: z
    .string()
    .min(3, "Alasan minimal 3 karakter")
    .max(255, "Alasan maksimal 255 karakter"),
});

// batas pengeluaran per kategori, berlaku tiap bulan (bagian dari Alokasi)
export const categoryLimitSchema = z.object({
  categoryId: z.string().min(1, "Pilih kategori"),
  amount: amountPositive("Batas harus lebih dari 0"),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type WalletInput = z.infer<typeof walletSchema>;
export type CategoryInput = z.infer<typeof categorySchema>;
export type TransactionInput = z.infer<typeof transactionSchema>;
export const goalSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi").max(60),
  targetAmount: amountPositive("Target harus lebih dari 0"),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Warna tidak valid"),
  targetDate: z
    .union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")])
    .optional(),
  // "" = progres dicatat manual; id dompet = progres ikut saldo dompet itu
  walletId: z.string().optional(),
});

export const goalSavingSchema = z.object({
  amount: amountPositive("Jumlah harus lebih dari 0"),
});

export const allocationBucketSchema = z.object({
  // kosong = pos baru
  id: z.string().optional(),
  name: z
    .string()
    .trim()
    .min(1, "Nama pos wajib diisi")
    .max(40, "Nama pos maksimal 40 karakter"),
  percent: z.coerce
    .number<number>()
    .int("Persen harus bilangan bulat")
    .min(1, "Persen minimal 1")
    .max(100, "Persen maksimal 100"),
  kind: z.enum(["expense", "savings"]),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Warna tidak valid"),
});

export const allocationBucketsSchema = z
  .object({
    buckets: z
      .array(allocationBucketSchema)
      .min(1, "Minimal satu pos")
      .max(8, "Maksimal 8 pos"),
  })
  .refine((d) => d.buckets.reduce((s, b) => s + b.percent, 0) === 100, {
    message: "Total persen semua pos harus 100%",
    path: ["buckets"],
  });

export const allocationOverrideSchema = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/, "Bulan tidak valid"),
  amount: amountNonNegative,
});

export type AdjustBalanceInput = z.infer<typeof adjustBalanceSchema>;
export type AllocationBucketInput = z.infer<typeof allocationBucketSchema>;
export type AllocationBucketsInput = z.infer<typeof allocationBucketsSchema>;
export type AllocationOverrideInput = z.infer<typeof allocationOverrideSchema>;
// Bentuk data yang dikirim dari localStorage (mode tanpa akun) saat
// migrasi ke akun asli — divalidasi ketat di server karena datang dari
// klien dan bisa saja sudah diutak-atik.
export const guestImportSchema = z.object({
  wallets: z.array(
    z.object({
      id: z.uuid(),
      name: z.string().min(1).max(50),
      type: z.enum(["cash", "bank", "ewallet"]),
      initialBalance: z.string().regex(/^-?\d+$/),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
    })
  ),
  categories: z.array(
    z.object({
      id: z.uuid(),
      name: z.string().min(1).max(50),
      type: z.enum(["income", "expense"]),
      icon: z.string().min(1),
      color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      isDefault: z.boolean(),
    })
  ),
  transactions: z.array(
    z.object({
      id: z.uuid(),
      walletId: z.uuid(),
      categoryId: z.uuid().nullable(),
      type: z.enum(["income", "expense", "transfer", "adjustment"]),
      amount: z.string().regex(/^-?\d+$/),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      note: z.string().nullable(),
      transferToWalletId: z.uuid().nullable(),
    })
  ),
});

export type GuestImportInput = z.infer<typeof guestImportSchema>;

export type CategoryLimitInput = z.infer<typeof categoryLimitSchema>;
export type RecurringInput = z.infer<typeof recurringSchema>;
export type GoalInput = z.infer<typeof goalSchema>;
export type GoalSavingInput = z.infer<typeof goalSavingSchema>;
