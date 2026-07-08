import { and, desc, eq, gte, ilike, lte, sql, type SQL } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import {
  budgets,
  categories,
  goals,
  recurringRules,
  transactions,
  wallets,
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
    // income menambah, expense & transfer keluar mengurangi
    db
      .select({
        walletId: transactions.walletId,
        delta: sql<string>`sum(case when ${transactions.type} = 'income' then ${transactions.amount} else -${transactions.amount} end)`,
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
