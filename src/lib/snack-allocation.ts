// Membandingkan batas jajan dengan jatah pos di rencana alokasi. Keduanya
// diisi terpisah, jadi tanpa perbandingan ini batas jajan bisa lebih besar
// dari jatah pos tempat kategori jajannya berada tanpa ada yang memberi tahu.
// Tanpa import supaya mudah diuji.

export type SnackAllocationLink =
  // pemasukan periode ini belum ada (belum tercatat dan belum diisi manual),
  // jadi jatah pos Rp 0 dan perbandingannya tidak berarti
  | { kind: "no-income" }
  | { kind: "ok"; planned: number; bucketNames: string[] }
  | { kind: "over"; planned: number; excess: number; bucketNames: string[] };

type BucketLike = {
  id: string;
  name: string;
  planned: number;
  categories: { categoryId: string }[];
};

// null = tidak ada yang bisa dibandingkan (belum ada rencana alokasi, atau
// tidak ada kategori jajan yang dipetakan ke pos pengeluaran)
export function compareSnackWithAllocation(input: {
  snackLimit: number;
  snackCategoryIds: string[];
  buckets: BucketLike[];
  incomeUsed: number;
}): SnackAllocationLink | null {
  const snackIds = new Set(input.snackCategoryIds);
  const linked = input.buckets.filter((b) =>
    b.categories.some((c) => snackIds.has(c.categoryId))
  );
  if (linked.length === 0) return null;

  if (input.incomeUsed <= 0) return { kind: "no-income" };

  const planned = linked.reduce((sum, b) => sum + b.planned, 0);
  const bucketNames = linked.map((b) => b.name);
  if (input.snackLimit > planned) {
    return {
      kind: "over",
      planned,
      excess: input.snackLimit - planned,
      bucketNames,
    };
  }
  return { kind: "ok", planned, bucketNames };
}
