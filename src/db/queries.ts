import {
  and,
  desc,
  eq,
  gte,
  ilike,
  inArray,
  lte,
  sql,
  type SQL,
} from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  allocationBuckets,
  allocationCategoryLinks,
  allocationIncomeCategories,
  allocationIncomeOverrides,
  allocationWalletLinks,
  budgets,
  categories,
  goals,
  recurringRules,
  transactions,
  wallets,
  type AllocationBucket,
  type TransactionType,
  type Wallet,
} from "@/db/schema";

export type WalletWithBalance = Wallet & { balance: number };

// Saldo dihitung dari initial_balance + agregasi transaksi,
// bukan field yang di-update manual, supaya selalu konsisten.
export async function getWalletsWithBalances(
  userId: string
): Promise<WalletWithBalance[]> {
  const [walletRows, deltaRows, transferInRows] = await Promise.all([
    db.query.wallets.findMany({
      where: eq(wallets.userId, userId),
      orderBy: (w, { asc }) => [asc(w.createdAt)],
    }),
    // income & adjustment (nilainya sudah bertanda) menambah,
    // expense & transfer keluar mengurangi
    db
      .select({
        walletId: transactions.walletId,
        delta: sql<string>`sum(case when ${transactions.type} in ('income', 'adjustment') then ${transactions.amount} else -${transactions.amount} end)`,
      })
      .from(transactions)
      .where(eq(transactions.userId, userId))
      .groupBy(transactions.walletId),
    // transfer masuk menambah saldo dompet tujuan
    db
      .select({
        walletId: transactions.transferToWalletId,
        delta: sql<string>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(
        and(eq(transactions.userId, userId), eq(transactions.type, "transfer"))
      )
      .groupBy(transactions.transferToWalletId),
  ]);

  const deltas = new Map<string, number>();
  for (const r of deltaRows) {
    deltas.set(r.walletId, Number(r.delta));
  }
  for (const r of transferInRows) {
    if (!r.walletId) continue;
    deltas.set(r.walletId, (deltas.get(r.walletId) ?? 0) + Number(r.delta));
  }

  return walletRows.map((w) => ({
    ...w,
    balance: Number(w.initialBalance) + (deltas.get(w.id) ?? 0),
  }));
}

const monthOf = sql<string>`to_char(${transactions.date}, 'YYYY-MM')`;

// Total pemasukan & pengeluaran satu bulan (transfer tidak dihitung)
export async function getMonthSummary(userId: string, month: string) {
  const [row] = await db
    .select({
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
      expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), eq(monthOf, month)));

  return { income: Number(row.income), expense: Number(row.expense) };
}

export async function getExpenseByCategory(userId: string, month: string) {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      name: sql<string>`coalesce(${categories.name}, 'Tanpa Kategori')`,
      color: sql<string>`coalesce(${categories.color}, '#737373')`,
      total: sql<string>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        eq(monthOf, month)
      )
    )
    .groupBy(transactions.categoryId, categories.name, categories.color)
    .orderBy(desc(sql`sum(${transactions.amount})`));

  return rows.map((r) => ({ ...r, total: Number(r.total) }));
}

export async function getIncomeByCategory(userId: string, month: string) {
  const rows = await db
    .select({
      categoryId: transactions.categoryId,
      name: sql<string>`coalesce(${categories.name}, 'Tanpa Kategori')`,
      color: sql<string>`coalesce(${categories.color}, '#737373')`,
      total: sql<string>`sum(${transactions.amount})`,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "income"),
        eq(monthOf, month)
      )
    )
    .groupBy(transactions.categoryId, categories.name, categories.color)
    .orderBy(desc(sql`sum(${transactions.amount})`));

  return rows.map((r) => ({ ...r, total: Number(r.total) }));
}

export async function getRecentTransactions(userId: string, limit = 8) {
  return db.query.transactions.findMany({
    where: eq(transactions.userId, userId),
    orderBy: [desc(transactions.date), desc(transactions.createdAt)],
    limit,
  });
}

export type BudgetWithProgress = {
  id: string;
  categoryId: string;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  month: string;
  amount: number;
  spent: number;
};

export async function getBudgetsWithSpent(
  userId: string,
  month: string
): Promise<BudgetWithProgress[]> {
  const [budgetRows, spentRows] = await Promise.all([
    db
      .select({
        id: budgets.id,
        categoryId: budgets.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        month: budgets.month,
        amount: budgets.amount,
      })
      .from(budgets)
      .innerJoin(categories, eq(budgets.categoryId, categories.id))
      .where(and(eq(budgets.userId, userId), eq(budgets.month, month))),
    db
      .select({
        categoryId: transactions.categoryId,
        total: sql<string>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "expense"),
          eq(monthOf, month)
        )
      )
      .groupBy(transactions.categoryId),
  ]);

  const spentMap = new Map(
    spentRows.map((r) => [r.categoryId, Number(r.total)])
  );

  return budgetRows.map((b) => ({
    ...b,
    amount: Number(b.amount),
    spent: spentMap.get(b.categoryId) ?? 0,
  }));
}

export type TransactionFilters = {
  type?: TransactionType;
  walletId?: string;
  categoryId?: string;
  dateFrom?: string;
  dateTo?: string;
  q?: string;
  page?: number;
  pageSize?: number;
};

export async function getTransactionsPage(
  userId: string,
  filters: TransactionFilters = {}
) {
  const pageSize = filters.pageSize ?? 20;
  const page = Math.max(1, filters.page ?? 1);

  const transferWallets = alias(wallets, "transfer_wallets");
  const conditions: SQL[] = [eq(transactions.userId, userId)];
  if (filters.type) conditions.push(eq(transactions.type, filters.type));
  if (filters.walletId)
    conditions.push(eq(transactions.walletId, filters.walletId));
  if (filters.categoryId)
    conditions.push(eq(transactions.categoryId, filters.categoryId));
  if (filters.dateFrom) conditions.push(gte(transactions.date, filters.dateFrom));
  if (filters.dateTo) conditions.push(lte(transactions.date, filters.dateTo));
  if (filters.q) conditions.push(ilike(transactions.note, `%${filters.q}%`));

  const where = and(...conditions);

  const [rows, [countRow]] = await Promise.all([
    db
      .select({
        id: transactions.id,
        type: transactions.type,
        amount: transactions.amount,
        date: transactions.date,
        note: transactions.note,
        walletId: transactions.walletId,
        walletName: wallets.name,
        categoryId: transactions.categoryId,
        categoryName: categories.name,
        categoryColor: categories.color,
        categoryIcon: categories.icon,
        transferToWalletId: transactions.transferToWalletId,
        transferToWalletName: transferWallets.name,
      })
      .from(transactions)
      .innerJoin(wallets, eq(transactions.walletId, wallets.id))
      .leftJoin(categories, eq(transactions.categoryId, categories.id))
      .leftJoin(
        transferWallets,
        eq(transactions.transferToWalletId, transferWallets.id)
      )
      .where(where)
      .orderBy(desc(transactions.date), desc(transactions.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),
    db
      .select({ count: sql<string>`count(*)` })
      .from(transactions)
      .where(where),
  ]);

  const total = Number(countRow.count);
  return {
    rows,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export type TransactionRow = Awaited<
  ReturnType<typeof getTransactionsPage>
>["rows"][number];

export async function getRecurringRules(userId: string) {
  const transferWallets = alias(wallets, "transfer_wallets");
  return db
    .select({
      id: recurringRules.id,
      type: recurringRules.type,
      amount: recurringRules.amount,
      note: recurringRules.note,
      frequency: recurringRules.frequency,
      startDate: recurringRules.startDate,
      nextRun: recurringRules.nextRun,
      active: recurringRules.active,
      walletId: recurringRules.walletId,
      walletName: wallets.name,
      categoryId: recurringRules.categoryId,
      categoryName: categories.name,
      categoryColor: categories.color,
      categoryIcon: categories.icon,
      transferToWalletId: recurringRules.transferToWalletId,
      transferToWalletName: transferWallets.name,
    })
    .from(recurringRules)
    .innerJoin(wallets, eq(recurringRules.walletId, wallets.id))
    .leftJoin(categories, eq(recurringRules.categoryId, categories.id))
    .leftJoin(
      transferWallets,
      eq(recurringRules.transferToWalletId, transferWallets.id)
    )
    .where(eq(recurringRules.userId, userId))
    .orderBy(desc(recurringRules.createdAt));
}

export type RecurringRow = Awaited<
  ReturnType<typeof getRecurringRules>
>[number];

// Tren pemasukan/pengeluaran per bulan, `months` bulan terakhir
// yang berakhir di `endMonth` (format "YYYY-MM")
export async function getMonthlyTrend(
  userId: string,
  endMonth: string,
  months = 6
) {
  const [ey, em] = endMonth.split("-").map(Number);
  const startTotal = ey * 12 + (em - 1) - (months - 1);
  const startMonth = `${Math.floor(startTotal / 12)}-${String((startTotal % 12) + 1).padStart(2, "0")}`;

  const rows = await db
    .select({
      month: monthOf,
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
      expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(monthOf, startMonth),
        lte(monthOf, endMonth)
      )
    )
    .groupBy(monthOf)
    .orderBy(monthOf);

  const byMonth = new Map(rows.map((r) => [r.month, r]));
  const result: { month: string; income: number; expense: number }[] = [];
  for (let i = 0; i < months; i++) {
    const total = startTotal + i;
    const key = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
    const row = byMonth.get(key);
    result.push({
      month: key,
      income: Number(row?.income ?? 0),
      expense: Number(row?.expense ?? 0),
    });
  }
  return result;
}

export async function getGoals(userId: string) {
  return db.query.goals.findMany({
    where: eq(goals.userId, userId),
    orderBy: (g, { asc }) => [asc(g.createdAt)],
  });
}

export async function getUserCategories(userId: string) {
  return db.query.categories.findMany({
    where: eq(categories.userId, userId),
    orderBy: (c, { asc }) => [asc(c.type), asc(c.name)],
  });
}

// ---------- Alokasi pendapatan ----------

export type AllocationPlan = {
  buckets: AllocationBucket[];
  categoryLinks: { categoryId: string; bucketId: string }[];
  walletLinks: { walletId: string; bucketId: string }[];
  incomeCategoryIds: string[];
};

export async function getAllocationPlan(userId: string): Promise<AllocationPlan> {
  const [buckets, categoryLinks, walletLinks, incomeCategories] =
    await Promise.all([
      db.query.allocationBuckets.findMany({
        where: eq(allocationBuckets.userId, userId),
        orderBy: (b, { asc }) => [asc(b.sortOrder), asc(b.createdAt)],
      }),
      db
        .select({
          categoryId: allocationCategoryLinks.categoryId,
          bucketId: allocationCategoryLinks.bucketId,
        })
        .from(allocationCategoryLinks)
        .where(eq(allocationCategoryLinks.userId, userId)),
      db
        .select({
          walletId: allocationWalletLinks.walletId,
          bucketId: allocationWalletLinks.bucketId,
        })
        .from(allocationWalletLinks)
        .where(eq(allocationWalletLinks.userId, userId)),
      db
        .select({ categoryId: allocationIncomeCategories.categoryId })
        .from(allocationIncomeCategories)
        .where(eq(allocationIncomeCategories.userId, userId)),
    ]);

  return {
    buckets,
    categoryLinks,
    walletLinks,
    incomeCategoryIds: incomeCategories.map((r) => r.categoryId),
  };
}

export type AllocationBucketProgress = AllocationBucket & {
  planned: number;
  actual: number;
  // jumlah kategori (pos pengeluaran) atau dompet (pos tabungan) yang terpetakan
  linkedCount: number;
};

export type AllocationOverview = {
  hasPlan: boolean;
  income: {
    auto: number;
    override: number | null;
    used: number;
    sourceCount: number;
  };
  buckets: AllocationBucketProgress[];
  unmapped: { total: number; items: { name: string; total: number }[] };
};

// Rencana vs realisasi satu bulan:
// - pemasukan = transaksi income bulan itu di kategori terpilih (atau override)
// - pos pengeluaran = expense bulan itu di kategori yang dipetakan ke pos
// - pos tabungan = transfer masuk ke dompet pos dikurangi transfer keluar
//   darinya (transfer antar dompet dalam pos yang sama tidak dihitung)
// Transaksi adjustment tidak ikut karena semua filter di sini per-tipe.
export async function getAllocationOverview(
  userId: string,
  month: string,
  plan?: AllocationPlan
): Promise<AllocationOverview> {
  const p = plan ?? (await getAllocationPlan(userId));
  const emptyIncome = {
    auto: 0,
    override: null,
    used: 0,
    sourceCount: p.incomeCategoryIds.length,
  };
  if (p.buckets.length === 0) {
    return {
      hasPlan: false,
      income: emptyIncome,
      buckets: [],
      unmapped: { total: 0, items: [] },
    };
  }

  const [incomeRows, override, expenseByCategory, transfers] =
    await Promise.all([
      p.incomeCategoryIds.length > 0
        ? db
            .select({
              total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
            })
            .from(transactions)
            .where(
              and(
                eq(transactions.userId, userId),
                eq(transactions.type, "income"),
                eq(monthOf, month),
                inArray(transactions.categoryId, p.incomeCategoryIds)
              )
            )
        : Promise.resolve([{ total: "0" }]),
      db.query.allocationIncomeOverrides.findFirst({
        where: and(
          eq(allocationIncomeOverrides.userId, userId),
          eq(allocationIncomeOverrides.month, month)
        ),
      }),
      getExpenseByCategory(userId, month),
      db
        .select({
          walletId: transactions.walletId,
          transferToWalletId: transactions.transferToWalletId,
          amount: transactions.amount,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "transfer"),
            eq(monthOf, month)
          )
        ),
    ]);

  const auto = Number(incomeRows[0]?.total ?? 0);
  const overrideAmount = override ? Number(override.amount) : null;
  const used = overrideAmount ?? auto;

  const categoryToBucket = new Map(
    p.categoryLinks.map((l) => [l.categoryId, l.bucketId])
  );
  const walletToBucket = new Map(
    p.walletLinks.map((l) => [l.walletId, l.bucketId])
  );
  const expenseBucketIds = new Set(
    p.buckets.filter((b) => b.kind === "expense").map((b) => b.id)
  );

  const actual = new Map<string, number>();
  const unmappedItems: { name: string; total: number }[] = [];

  for (const row of expenseByCategory) {
    const bucketId = row.categoryId
      ? categoryToBucket.get(row.categoryId)
      : undefined;
    if (bucketId && expenseBucketIds.has(bucketId)) {
      actual.set(bucketId, (actual.get(bucketId) ?? 0) + row.total);
    } else {
      unmappedItems.push({ name: row.name, total: row.total });
    }
  }

  for (const t of transfers) {
    const from = walletToBucket.get(t.walletId);
    const to = t.transferToWalletId
      ? walletToBucket.get(t.transferToWalletId)
      : undefined;
    if (from === to) continue;
    const amount = Number(t.amount);
    if (to) actual.set(to, (actual.get(to) ?? 0) + amount);
    if (from) actual.set(from, (actual.get(from) ?? 0) - amount);
  }

  const buckets: AllocationBucketProgress[] = p.buckets.map((b) => ({
    ...b,
    planned: Math.round((used * b.percent) / 100),
    actual: actual.get(b.id) ?? 0,
    linkedCount:
      b.kind === "expense"
        ? p.categoryLinks.filter((l) => l.bucketId === b.id).length
        : p.walletLinks.filter((l) => l.bucketId === b.id).length,
  }));

  return {
    hasPlan: true,
    income: { ...emptyIncome, auto, override: overrideAmount, used },
    buckets,
    unmapped: {
      total: unmappedItems.reduce((s, i) => s + i.total, 0),
      items: unmappedItems,
    },
  };
}
