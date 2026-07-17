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
export type TransactionType = "income" | "expense" | "transfer";

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
// savedAmount adalah catatan progres manual — tidak mengubah saldo dompet.
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
    color: text("color").notNull().default("#6366f1"),
    targetDate: date("target_date", { mode: "string" }),
    createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
  },
  (table) => [index("goals_user_id_idx").on(table.userId)]
);

export type User = typeof users.$inferSelect;
export type Wallet = typeof wallets.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type Budget = typeof budgets.$inferSelect;
export type RecurringRule = typeof recurringRules.$inferSelect;
export type Goal = typeof goals.$inferSelect;
