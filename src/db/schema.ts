import {
  boolean,
  date,
  index,
  integer,
  numeric,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import type { AdapterAccountType } from "next-auth/adapters";

// ---------- Auth (NextAuth / Auth.js) ----------

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").notNull().unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
  hashedPassword: text("hashed_password"),
  createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const authAccounts = pgTable(
  "auth_accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").$type<AdapterAccountType>().notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.providerAccountId] }),
  ]
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (table) => [primaryKey({ columns: [table.identifier, table.token] })]
);

// ---------- Keuangan ----------

export type WalletType = "cash" | "bank" | "ewallet";
export type CategoryType = "income" | "expense";
export type TransactionType = "income" | "expense" | "transfer" | "adjustment";

// "Dompet" milik user: cash / rekening bank / e-wallet.
// Dinamai wallets agar tidak bentrok dengan tabel auth_accounts milik NextAuth.
export const wallets = pgTable(
  "wallets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").$type<WalletType>().notNull(),
    // Nominal Rupiah disimpan sebagai numeric agar aman dari overflow/pembulatan
    initialBalance: numeric("initial_balance", { precision: 14, scale: 0 })
      .notNull()
      .default("0"),
    color: text("color").notNull().default("#6366f1"),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("wallets_user_id_idx").on(table.userId)]
);

export const categories = pgTable(
  "categories",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    type: text("type").$type<CategoryType>().notNull(),
    icon: text("icon").notNull().default("circle"),
    color: text("color").notNull().default("#6366f1"),
    isDefault: boolean("is_default").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("categories_user_id_idx").on(table.userId)]
);

export const transactions = pgTable(
  "transactions",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    walletId: text("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    // null untuk transfer antar dompet
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    type: text("type").$type<TransactionType>().notNull(),
    amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
    date: date("date", { mode: "string" }).notNull(),
    note: text("note"),
    // hanya terisi untuk type = "transfer"
    transferToWalletId: text("transfer_to_wallet_id").references(
      () => wallets.id,
      { onDelete: "cascade" }
    ),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("transactions_user_id_idx").on(table.userId),
    index("transactions_user_date_idx").on(table.userId, table.date),
    index("transactions_wallet_id_idx").on(table.walletId),
    index("transactions_category_id_idx").on(table.categoryId),
  ]
);

// TABEL LAMA, tidak dipakai aplikasi lagi: fitur Budget sudah digabung ke
// Alokasi (lihat categoryLimits). Isinya sudah disalin ke category_limits;
// definisinya dibiarkan di sini supaya `db:push` tidak diam-diam menghapus
// tabel beserta datanya. Hapus bersama tabelnya kalau sudah yakin.
export const budgets = pgTable(
  "budgets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
    // format "YYYY-MM"
    month: text("month").notNull(),
    amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("budgets_user_month_idx").on(table.userId, table.month),
    uniqueIndex("budgets_user_category_month_uq").on(
      table.userId,
      table.categoryId,
      table.month
    ),
  ]
);

export type RecurringFrequency = "daily" | "weekly" | "monthly";

// Aturan transaksi berulang (gaji, langganan, cicilan).
// Transaksi dibuat secara "lazy": setiap kali user membuka aplikasi,
// semua jadwal yang sudah jatuh tempo di-generate sampai hari ini.
export const recurringRules = pgTable(
  "recurring_rules",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    walletId: text("wallet_id")
      .notNull()
      .references(() => wallets.id, { onDelete: "cascade" }),
    categoryId: text("category_id").references(() => categories.id, {
      onDelete: "set null",
    }),
    type: text("type").$type<TransactionType>().notNull(),
    amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
    note: text("note"),
    transferToWalletId: text("transfer_to_wallet_id").references(
      () => wallets.id,
      { onDelete: "cascade" }
    ),
    frequency: text("frequency").$type<RecurringFrequency>().notNull(),
    // tanggal mulai; untuk frekuensi bulanan, tanggalnya jadi patokan
    // (mis. mulai 31 Jan -> 28 Feb -> 31 Mar)
    startDate: date("start_date", { mode: "string" }).notNull(),
    // eksekusi berikutnya yang belum dibuat transaksinya
    nextRun: date("next_run", { mode: "string" }).notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("recurring_rules_user_id_idx").on(table.userId)]
);

// Catatan percobaan untuk rate limiting (login/register).
// Disimpan di DB supaya bekerja lintas instance serverless.
export const rateLimits = pgTable(
  "rate_limits",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    key: text("key").notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    index("rate_limits_key_created_idx").on(table.key, table.createdAt),
  ]
);

// Target nabung / impian (mis. "Mouse gaming Rp 500rb").
// Kalau walletId diisi, progresnya = saldo dompet itu (otomatis); kalau
// kosong, progresnya dari savedAmount yang dicatat manual. Keduanya tidak
// mengubah saldo dompet mana pun.
export const goals = pgTable(
  "goals",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    targetAmount: numeric("target_amount", { precision: 14, scale: 0 }).notNull(),
    savedAmount: numeric("saved_amount", { precision: 14, scale: 0 })
      .notNull()
      .default("0"),
    walletId: text("wallet_id").references(() => wallets.id, {
      onDelete: "set null",
    }),
    color: text("color").notNull().default("#6366f1"),
    targetDate: date("target_date", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("goals_user_id_idx").on(table.userId)]
);

export type AllocationBucketKind = "expense" | "savings";

// Rencana alokasi pendapatan (mis. 50/30/20): satu set pos per user yang
// berlaku di semua bulan; nominal tiap pos dihitung dari pemasukan bulan itu.
// Pemetaan kategori/dompet ada di tabel terpisah (bukan kolom baru di
// categories/wallets) supaya tipe Category/Wallet yang dipakai guest-store
// tidak ikut berubah.
export const allocationBuckets = pgTable(
  "allocation_buckets",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    percent: integer("percent").notNull(),
    kind: text("kind").$type<AllocationBucketKind>().notNull(),
    color: text("color").notNull().default("#6366f1"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("allocation_buckets_user_id_idx").on(table.userId)]
);

// categoryId sebagai PK: satu kategori pengeluaran hanya bisa di satu pos
export const allocationCategoryLinks = pgTable(
  "allocation_category_links",
  {
    categoryId: text("category_id")
      .primaryKey()
      .references(() => categories.id, { onDelete: "cascade" }),
    bucketId: text("bucket_id")
      .notNull()
      .references(() => allocationBuckets.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("allocation_category_links_user_id_idx").on(table.userId)]
);

// walletId sebagai PK: satu dompet tabungan hanya bisa di satu pos
export const allocationWalletLinks = pgTable(
  "allocation_wallet_links",
  {
    walletId: text("wallet_id")
      .primaryKey()
      .references(() => wallets.id, { onDelete: "cascade" }),
    bucketId: text("bucket_id")
      .notNull()
      .references(() => allocationBuckets.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [index("allocation_wallet_links_user_id_idx").on(table.userId)]
);

// kategori pemasukan yang dijumlah sebagai dasar pembagian
export const allocationIncomeCategories = pgTable(
  "allocation_income_categories",
  {
    categoryId: text("category_id")
      .primaryKey()
      .references(() => categories.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
  },
  (table) => [
    index("allocation_income_categories_user_id_idx").on(table.userId),
  ]
);

// Batas pengeluaran per kategori (pengganti fitur Budget lama). Berlaku
// setiap bulan, tidak perlu diisi ulang; ditampilkan di rincian pos Alokasi.
export const categoryLimits = pgTable(
  "category_limits",
  {
    categoryId: text("category_id")
      .primaryKey()
      .references(() => categories.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
  },
  (table) => [index("category_limits_user_id_idx").on(table.userId)]
);

// nominal pemasukan yang diketik manual untuk satu bulan (menimpa hitungan
// otomatis bulan itu saja)
export const allocationIncomeOverrides = pgTable(
  "allocation_income_overrides",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    // format "YYYY-MM"
    month: text("month").notNull(),
    amount: numeric("amount", { precision: 14, scale: 0 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex("allocation_income_overrides_user_month_uq").on(
      table.userId,
      table.month
    ),
  ]
);

export type User = typeof users.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type RecurringRule = typeof recurringRules.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type AllocationBucket = typeof allocationBuckets.$inferSelect;
