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
  CALENDAR_PLAN,
  daysBetweenInclusive,
  periodKeyOf,
  periodLabel,
  periodNoun,
  periodRange,
  shiftPeriodKey,
  type PaydayPlan,
} from "@/lib/period";
import { addDaysTo as shiftDate } from "@/lib/goal-pace";
import { EMPTY_WALLET_USAGE, type WalletUsage } from "@/lib/wallet-usage";
import {
  allocationBuckets,
  allocationCategoryLinks,
  allocationIncomeCategories,
  allocationIncomeOverrides,
  allocationWalletLinks,
  categories,
  categoryLimits,
  goals,
  paydayOverrides,
  recurringRules,
  snackCategories,
  snackPlans,
  splitMembers,
  splitPayments,
  splits,
  transactions,
  userSettings,
  wallets,
  type AllocationBucket,
  type Goal,
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

// Rentang tanggal inklusif, dipakai untuk periode gajian yang tidak sejajar
// dengan bulan kalender (mis. 21 Okt sampai 20 Nov).
export type DateRange = { start: string; end: string };

const inRange = (r: DateRange) =>
  and(gte(transactions.date, r.start), lte(transactions.date, r.end));

// bulan kalender ("YYYY-MM") atau rentang tanggal sebagai kondisi query
const inPeriod = (p: string | DateRange) =>
  typeof p === "string" ? eq(monthOf, p) : inRange(p);

// Rencana periode pengguna: tanggal gajian biasa (1 = bulan kalender kalau
// belum diatur) beserta tanggal mulai khusus untuk bulan yang gajiannya
// bergeser
export async function getPayday(userId: string): Promise<PaydayPlan> {
  const [row, overrideRows] = await Promise.all([
    db.query.userSettings.findFirst({
      where: eq(userSettings.userId, userId),
    }),
    db
      .select({
        month: paydayOverrides.month,
        startDate: paydayOverrides.startDate,
      })
      .from(paydayOverrides)
      .where(eq(paydayOverrides.userId, userId)),
  ]);
  return {
    day: row?.paydayDay ?? 1,
    overrides: Object.fromEntries(overrideRows.map((r) => [r.month, r.startDate])),
  };
}

// Total pemasukan & pengeluaran satu bulan kalender atau satu periode gajian
// (transfer tidak dihitung)
export async function getMonthSummary(userId: string, period: string | DateRange) {
  const [row] = await db
    .select({
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
      expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(and(eq(transactions.userId, userId), inPeriod(period)));

  return { income: Number(row.income), expense: Number(row.expense) };
}

export async function getExpenseByCategory(
  userId: string,
  period: string | DateRange
) {
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
        inPeriod(period)
      )
    )
    .groupBy(transactions.categoryId, categories.name, categories.color)
    .orderBy(desc(sql`sum(${transactions.amount})`));

  return rows.map((r) => ({ ...r, total: Number(r.total) }));
}

export async function getIncomeByCategory(
  userId: string,
  period: string | DateRange
) {
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
        inPeriod(period)
      )
    )
    .groupBy(transactions.categoryId, categories.name, categories.color)
    .orderBy(desc(sql`sum(${transactions.amount})`));

  return rows.map((r) => ({ ...r, total: Number(r.total) }));
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
        // transaksi ini adalah biaya admin milik transaksi lain
        feeForId: transactions.feeForId,
        // total biaya admin yang menempel di transaksi ini
        fee: sql<string>`coalesce((select sum(f.amount) from transactions f where f.fee_for_id = ${transactions.id}), 0)`,
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
// `endMonth` dan `month` di hasil adalah kunci periode ("YYYY-MM" = bulan
// tempat periode dimulai). Batas tiap periode dihitung di sini (karena bisa
// bergeser per bulan), lalu transaksi dijumlah per hari di database dan
// dimasukkan ke periodenya di kode. Cara ini menghindari ekspresi
// GROUP BY yang berbeda dari SELECT, dan jumlah barisnya kecil.
export async function getMonthlyTrend(
  userId: string,
  endMonth: string,
  months = 6,
  payday: PaydayPlan = CALENDAR_PLAN
) {
  const keys = Array.from({ length: months }, (_, i) =>
    shiftPeriodKey(endMonth, i - (months - 1))
  );
  const ranges = keys.map((key) => ({ key, ...periodRange(key, payday) }));

  const rows = await db
    .select({
      date: transactions.date,
      income: sql<string>`coalesce(sum(case when ${transactions.type} = 'income' then ${transactions.amount} else 0 end), 0)`,
      expense: sql<string>`coalesce(sum(case when ${transactions.type} = 'expense' then ${transactions.amount} else 0 end), 0)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        gte(transactions.date, ranges[0].start),
        lte(transactions.date, ranges[ranges.length - 1].end)
      )
    )
    .groupBy(transactions.date);

  return ranges.map((r) => {
    let income = 0;
    let expense = 0;
    for (const row of rows) {
      if (row.date >= r.start && row.date <= r.end) {
        income += Number(row.income);
        expense += Number(row.expense);
      }
    }
    return { month: r.key, income, expense };
  });
}

export type GoalWithProgress = Goal & {
  saved: number;
  walletName: string | null;
};

// Progres impian: saldo dompet yang terhubung (tidak pernah negatif), atau
// savedAmount yang dicatat manual kalau tidak terhubung ke dompet.
export async function getGoalsWithProgress(
  userId: string
): Promise<GoalWithProgress[]> {
  const [goalRows, walletRows] = await Promise.all([
    db.query.goals.findMany({
      where: eq(goals.userId, userId),
      orderBy: (g, { asc }) => [asc(g.createdAt)],
    }),
    getWalletsWithBalances(userId),
  ]);
  const walletById = new Map(walletRows.map((w) => [w.id, w]));

  return goalRows.map((g) => {
    const wallet = g.walletId ? walletById.get(g.walletId) : undefined;
    return {
      ...g,
      saved: wallet ? Math.max(0, wallet.balance) : Number(g.savedAmount),
      walletName: wallet?.name ?? null,
    };
  });
}

export async function getUserCategories(userId: string) {
  return db.query.categories.findMany({
    where: eq(categories.userId, userId),
    orderBy: (c, { asc }) => [asc(c.type), asc(c.name)],
  });
}

// ---------- Jatah jajan ----------

export type SnackPlan = { limit: number; categoryIds: string[] };

// null kalau belum diatur, atau kalau kategorinya kosong (setelah kategori
// terakhirnya dihapus) karena batas tanpa kategori tidak berarti apa-apa
export async function getSnackPlan(userId: string): Promise<SnackPlan | null> {
  const [plan, links] = await Promise.all([
    db.query.snackPlans.findFirst({ where: eq(snackPlans.userId, userId) }),
    db
      .select({ categoryId: snackCategories.categoryId })
      .from(snackCategories)
      .where(eq(snackCategories.userId, userId)),
  ]);
  if (!plan || links.length === 0) return null;
  return {
    limit: Number(plan.monthlyLimit),
    categoryIds: links.map((l) => l.categoryId),
  };
}

// Belanja kategori jajan: total satu periode (bulan kalender atau rentang
// gajian), total di tanggal `today`, dan berapa kali transaksinya (untuk
// insight frekuensi).
export async function getSnackSpending(
  userId: string,
  period: string | DateRange,
  today: string,
  categoryIds: string[]
) {
  if (categoryIds.length === 0) return { spentMonth: 0, spentToday: 0, count: 0 };

  const [row] = await db
    .select({
      month: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      today: sql<string>`coalesce(sum(case when ${transactions.date} = ${today}::date then ${transactions.amount} else 0 end), 0)`,
      count: sql<string>`count(*)`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        inPeriod(period),
        inArray(transactions.categoryId, categoryIds)
      )
    );

  return {
    spentMonth: Number(row.month),
    spentToday: Number(row.today),
    count: Number(row.count),
  };
}

// Jatah jajan periode berjalan: periode ditentukan dari tanggal gajian
// (1 = bulan kalender), jadi `periodEnd` dipakai untuk menghitung sisa hari.
export async function getSnackOverview(
  userId: string,
  today: string,
  payday: PaydayPlan = CALENDAR_PLAN,
  // rencana yang sudah diambil pemanggil (null = memang belum ada), supaya
  // tidak diambil lagi dan bisa berjalan bersamaan dengan pengambilan payday
  preloadedPlan?: SnackPlan | null
) {
  const plan =
    preloadedPlan === undefined ? await getSnackPlan(userId) : preloadedPlan;
  if (!plan) return null;
  const key = periodKeyOf(today, payday);
  const range = periodRange(key, payday);
  const spending = await getSnackSpending(userId, range, today, plan.categoryIds);
  return {
    plan,
    ...spending,
    periodEnd: range.end,
    periodLabel: periodLabel(key, payday),
    periodNoun: periodNoun(payday),
  };
}

// Pengeluaran per hari dalam seminggu pada rentang tanggal. categoryIds
// null = semua kategori pengeluaran. dow mengikuti Postgres (0 = Minggu).
export async function getSpendingByWeekday(
  userId: string,
  from: string,
  to: string,
  categoryIds: string[] | null
) {
  if (categoryIds && categoryIds.length === 0) return [];

  const conditions: SQL[] = [
    eq(transactions.userId, userId),
    eq(transactions.type, "expense"),
    gte(transactions.date, from),
    lte(transactions.date, to),
  ];
  if (categoryIds) conditions.push(inArray(transactions.categoryId, categoryIds));

  const dow = sql<number>`extract(dow from ${transactions.date})::int`;
  const rows = await db
    .select({ dow, total: sql<string>`sum(${transactions.amount})` })
    .from(transactions)
    .where(and(...conditions))
    .groupBy(sql`extract(dow from ${transactions.date})`);

  return rows.map((r) => ({ dow: Number(r.dow), total: Number(r.total) }));
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

export type AllocationCategoryProgress = {
  categoryId: string;
  name: string;
  color: string;
  icon: string;
  spent: number;
  // batas per bulan (pengganti Budget lama), null = tanpa batas
  limit: number | null;
};

export type AllocationBucketProgress = AllocationBucket & {
  planned: number;
  actual: number;
  // jumlah kategori (pos pengeluaran) atau dompet (pos tabungan) yang terpetakan
  linkedCount: number;
  // rincian kategori, hanya untuk pos pengeluaran
  categories: AllocationCategoryProgress[];
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

// Rencana vs realisasi satu periode (bulan kalender, atau rentang gajian
// kalau tanggal gajian bukan 1):
// - pemasukan = transaksi income periode itu di kategori terpilih (atau override)
// - pos pengeluaran = expense periode itu di kategori yang dipetakan ke pos
// - pos tabungan = transfer masuk ke dompet pos dikurangi transfer keluar
//   darinya (transfer antar dompet dalam pos yang sama tidak dihitung)
// Transaksi adjustment tidak ikut karena semua filter di sini per-tipe.
export async function getAllocationOverview(
  userId: string,
  // kunci periode: bulan tempat periode dimulai ("YYYY-MM")
  month: string,
  plan?: AllocationPlan,
  // rencana periode (tanggal gajian dan bulan yang bergeser)
  payday: PaydayPlan = CALENDAR_PLAN
): Promise<AllocationOverview> {
  const p = plan ?? (await getAllocationPlan(userId));
  const range = periodRange(month, payday);
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

  const [
    incomeRows,
    override,
    expenseByCategory,
    transfers,
    userCategories,
    limitRows,
  ] = await Promise.all([
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
                inRange(range),
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
      getExpenseByCategory(userId, range),
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
            inRange(range)
          )
        ),
      getUserCategories(userId),
      db
        .select({
          categoryId: categoryLimits.categoryId,
          amount: categoryLimits.amount,
        })
        .from(categoryLimits)
        .where(eq(categoryLimits.userId, userId)),
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

  const spentByCategory = new Map(
    expenseByCategory
      .filter((r) => r.categoryId)
      .map((r) => [r.categoryId as string, r.total])
  );
  const limitByCategory = new Map(
    limitRows.map((l) => [l.categoryId, Number(l.amount)])
  );
  const categoryById = new Map(userCategories.map((c) => [c.id, c]));

  const buckets: AllocationBucketProgress[] = p.buckets.map((b) => {
    const categoryIds = p.categoryLinks
      .filter((l) => l.bucketId === b.id)
      .map((l) => l.categoryId);
    const bucketCategories: AllocationCategoryProgress[] =
      b.kind !== "expense"
        ? []
        : categoryIds
            .map((id) => categoryById.get(id))
            .filter((c) => c !== undefined)
            .map((c) => ({
              categoryId: c.id,
              name: c.name,
              color: c.color,
              icon: c.icon,
              spent: spentByCategory.get(c.id) ?? 0,
              limit: limitByCategory.get(c.id) ?? null,
            }))
            .sort((x, y) => y.spent - x.spent || x.name.localeCompare(y.name));

    return {
      ...b,
      planned: Math.round((used * b.percent) / 100),
      actual: actual.get(b.id) ?? 0,
      linkedCount:
        b.kind === "expense"
          ? categoryIds.length
          : p.walletLinks.filter((l) => l.bucketId === b.id).length,
      categories: bucketCategories,
    };
  });

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

// ---------- Dompet: pemakaian oleh data lain ----------

// Jumlah data yang bergantung pada tiap dompet, untuk memutuskan apakah
// dompet boleh dihapus (lihat src/lib/wallet-usage.ts).
export async function getWalletUsage(
  userId: string
): Promise<Record<string, WalletUsage>> {
  const [ownRows, incomingRows, goalRows, bucketRows, recurringRows] =
    await Promise.all([
      db
        .select({
          walletId: transactions.walletId,
          plain: sql<string>`sum(case when ${transactions.type} <> 'transfer' then 1 else 0 end)`,
          outgoing: sql<string>`sum(case when ${transactions.type} = 'transfer' then 1 else 0 end)`,
        })
        .from(transactions)
        .where(eq(transactions.userId, userId))
        .groupBy(transactions.walletId),
      db
        .select({
          walletId: transactions.transferToWalletId,
          total: sql<string>`count(*)`,
        })
        .from(transactions)
        .where(
          and(
            eq(transactions.userId, userId),
            eq(transactions.type, "transfer")
          )
        )
        .groupBy(transactions.transferToWalletId),
      db
        .select({ walletId: goals.walletId })
        .from(goals)
        .where(eq(goals.userId, userId)),
      db
        .select({ walletId: allocationWalletLinks.walletId })
        .from(allocationWalletLinks)
        .where(eq(allocationWalletLinks.userId, userId)),
      db
        .select({
          walletId: recurringRules.walletId,
          transferToWalletId: recurringRules.transferToWalletId,
        })
        .from(recurringRules)
        .where(eq(recurringRules.userId, userId)),
    ]);

  const usage: Record<string, WalletUsage> = {};
  const of = (id: string) => (usage[id] ??= { ...EMPTY_WALLET_USAGE });

  for (const r of ownRows) {
    const u = of(r.walletId);
    u.transactions += Number(r.plain);
    u.transfers += Number(r.outgoing);
  }
  for (const r of incomingRows) {
    if (r.walletId) of(r.walletId).transfers += Number(r.total);
  }
  for (const r of goalRows) {
    if (r.walletId) of(r.walletId).goals += 1;
  }
  for (const r of bucketRows) of(r.walletId).buckets += 1;
  for (const r of recurringRows) {
    of(r.walletId).recurring += 1;
    if (r.transferToWalletId) of(r.transferToWalletId).recurring += 1;
  }
  return usage;
}

// ---------- Tabungan & ketahanan uang ----------

// Uang yang dipindahkan ke dompet tabungan (dompet yang terhubung ke pos
// bertipe tabungan di Alokasi) pada satu rentang tanggal, dihitung bersih:
// transfer keluar dari dompet tabungan mengurangi. null kalau belum ada
// dompet tabungan yang terhubung.
export async function getSavingsTransferred(
  userId: string,
  range: DateRange
): Promise<number | null> {
  const savingsRows = await db
    .select({ walletId: allocationWalletLinks.walletId })
    .from(allocationWalletLinks)
    .innerJoin(
      allocationBuckets,
      eq(allocationWalletLinks.bucketId, allocationBuckets.id)
    )
    .where(
      and(
        eq(allocationWalletLinks.userId, userId),
        eq(allocationBuckets.kind, "savings")
      )
    );
  if (savingsRows.length === 0) return null;
  const savings = new Set(savingsRows.map((r) => r.walletId));

  const rows = await db
    .select({
      walletId: transactions.walletId,
      toWalletId: transactions.transferToWalletId,
      amount: transactions.amount,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "transfer"),
        inRange(range)
      )
    );

  let net = 0;
  for (const t of rows) {
    const fromSavings = savings.has(t.walletId);
    const toSavings = !!t.toWalletId && savings.has(t.toWalletId);
    if (fromSavings === toSavings) continue;
    net += toSavings ? Number(t.amount) : -Number(t.amount);
  }
  return net;
}

// Rata-rata pengeluaran harian dari `windowDays` hari terakhir (sampai
// `today`). Kalau catatan pengeluaran tertua lebih baru dari awal jendela,
// pembaginya hanya sejak catatan itu, supaya pengguna baru tidak terlihat
// sangat hemat. null kalau tidak ada pengeluaran sama sekali.
export async function getAverageDailyExpense(
  userId: string,
  today: string,
  windowDays = 90
): Promise<{ perDay: number; days: number } | null> {
  const start = shiftDate(today, -(windowDays - 1));
  const [row] = await db
    .select({
      total: sql<string>`coalesce(sum(${transactions.amount}), 0)`,
      first: sql<string | null>`min(${transactions.date})::text`,
    })
    .from(transactions)
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        gte(transactions.date, start),
        lte(transactions.date, today)
      )
    );
  const total = Number(row.total);
  if (total <= 0 || !row.first) return null;
  const days = Math.min(windowDays, daysBetweenInclusive(row.first, today));
  return { perDay: total / Math.max(1, days), days };
}

// Perubahan bersih saldo tiap dompet sejak tanggal `from` (inklusif), dipakai
// untuk memperkirakan laju menabung impian. Rumusnya sama dengan saldo dompet.
export async function getWalletNetChange(
  userId: string,
  from: string
): Promise<Map<string, number>> {
  const result = new Map<string, number>();

  const [ownRows, incomingRows] = await Promise.all([
    db
      .select({
        walletId: transactions.walletId,
        delta: sql<string>`sum(case when ${transactions.type} in ('income', 'adjustment') then ${transactions.amount} else -${transactions.amount} end)`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          gte(transactions.date, from)
        )
      )
      .groupBy(transactions.walletId),
    db
      .select({
        walletId: transactions.transferToWalletId,
        delta: sql<string>`sum(${transactions.amount})`,
      })
      .from(transactions)
      .where(
        and(
          eq(transactions.userId, userId),
          eq(transactions.type, "transfer"),
          gte(transactions.date, from)
        )
      )
      .groupBy(transactions.transferToWalletId),
  ]);

  for (const r of ownRows) result.set(r.walletId, Number(r.delta));
  for (const r of incomingRows) {
    if (!r.walletId) continue;
    result.set(r.walletId, (result.get(r.walletId) ?? 0) + Number(r.delta));
  }
  return result;
}

// Pengeluaran tunggal terbesar dalam satu rentang tanggal
export async function getBiggestExpense(userId: string, range: DateRange) {
  const [row] = await db
    .select({
      amount: transactions.amount,
      date: transactions.date,
      note: transactions.note,
      categoryName: categories.name,
    })
    .from(transactions)
    .leftJoin(categories, eq(transactions.categoryId, categories.id))
    .where(
      and(
        eq(transactions.userId, userId),
        eq(transactions.type, "expense"),
        inRange(range)
      )
    )
    .orderBy(desc(transactions.amount))
    .limit(1);
  if (!row) return null;
  return {
    amount: Number(row.amount),
    date: row.date,
    note: row.note,
    categoryName: row.categoryName ?? "Tanpa Kategori",
  };
}

// ---------- Talangan ----------

export type SplitMemberView = {
  id: string;
  name: string;
  isSelf: boolean;
  amount: number | null;
  paid: number;
  payments: { id: string; amount: number; date: string; inWallet: boolean }[];
};

export type SplitView = {
  id: string;
  title: string;
  total: number;
  date: string;
  note: string | null;
  walletId: string | null;
  walletName: string | null;
  // pengeluaran aslinya tercatat di Transaksi
  hasExpense: boolean;
  members: SplitMemberView[];
};

export async function getSplits(userId: string): Promise<SplitView[]> {
  const [splitRows, memberRows, paymentRows] = await Promise.all([
    db
      .select({
        id: splits.id,
        title: splits.title,
        total: splits.total,
        date: splits.date,
        note: splits.note,
        transactionId: splits.transactionId,
        walletId: splits.walletId,
        walletName: wallets.name,
      })
      .from(splits)
      .leftJoin(wallets, eq(splits.walletId, wallets.id))
      .where(eq(splits.userId, userId))
      .orderBy(desc(splits.date), desc(splits.createdAt)),
    db
      .select()
      .from(splitMembers)
      .where(eq(splitMembers.userId, userId))
      .orderBy(splitMembers.sortOrder, splitMembers.createdAt),
    db
      .select()
      .from(splitPayments)
      .where(eq(splitPayments.userId, userId))
      .orderBy(desc(splitPayments.date), desc(splitPayments.createdAt)),
  ]);

  const paymentsBy = new Map<string, SplitMemberView["payments"]>();
  for (const p of paymentRows) {
    const list = paymentsBy.get(p.memberId) ?? [];
    list.push({
      id: p.id,
      amount: Number(p.amount),
      date: p.date,
      inWallet: !!p.transactionId,
    });
    paymentsBy.set(p.memberId, list);
  }

  const membersBy = new Map<string, SplitMemberView[]>();
  for (const m of memberRows) {
    const payments = paymentsBy.get(m.id) ?? [];
    const list = membersBy.get(m.splitId) ?? [];
    list.push({
      id: m.id,
      name: m.name,
      isSelf: m.isSelf,
      amount: m.amount === null ? null : Number(m.amount),
      paid: payments.reduce((s, p) => s + p.amount, 0),
      payments,
    });
    membersBy.set(m.splitId, list);
  }

  return splitRows.map((s) => ({
    id: s.id,
    title: s.title,
    total: Number(s.total),
    date: s.date,
    note: s.note,
    walletId: s.walletId,
    walletName: s.walletName,
    hasExpense: !!s.transactionId,
    members: membersBy.get(s.id) ?? [],
  }));
}
