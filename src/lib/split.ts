// Hitungan patungan/talangan. Tanpa import supaya mudah diuji dan bisa dipakai
// di server maupun klien.
//
// Satu talangan = satu pengeluaran yang kamu bayar dulu (total), lalu dibagi
// ke beberapa orang. Nominal tiap orang boleh belum ditentukan (null): yang
// penting siapa saja yang ikut. Sisa yang belum dibagi dihitung dari total
// dikurangi nominal yang sudah ditentukan, dan bisa dibagi rata ke orang yang
// belum punya nominal.

export type SplitMemberInput = {
  id: string;
  name: string;
  // true untuk bagianmu sendiri: ikut dihitung dalam pembagian, tapi tidak
  // pernah dianggap berutang padamu
  isSelf: boolean;
  amount: number | null;
  // total yang sudah dikembalikan orang ini
  paid: number;
};

export type SplitSummary = {
  // jumlah nominal yang sudah ditentukan (termasuk bagianmu)
  assigned: number;
  // total dikurangi assigned: positif = belum dibagi, negatif = kelebihan
  remaining: number;
  over: boolean;
  unassignedCount: number;
  // perkiraan per orang kalau sisa dibagi rata ke yang belum ditentukan
  suggestedEach: number;
  // yang diharapkan dari orang lain, yang sudah kembali, dan yang belum
  expectedFromOthers: number;
  collected: number;
  outstanding: number;
  // semua nominal sudah ditentukan dan pas dengan total
  fullyAssigned: boolean;
  // fullyAssigned dan semua orang lain sudah membayar
  settled: boolean;
};

export function summarizeSplit(
  total: number,
  members: SplitMemberInput[]
): SplitSummary {
  let assigned = 0;
  let unassignedCount = 0;
  let expectedFromOthers = 0;
  let collected = 0;
  let outstanding = 0;

  for (const m of members) {
    if (m.amount === null) unassignedCount++;
    else assigned += m.amount;
    if (m.isSelf) continue;
    collected += m.paid;
    if (m.amount !== null) {
      expectedFromOthers += m.amount;
      outstanding += Math.max(0, m.amount - m.paid);
    }
  }

  const remaining = total - assigned;
  const fullyAssigned = remaining === 0 && unassignedCount === 0;
  return {
    assigned,
    remaining,
    over: remaining < 0,
    unassignedCount,
    suggestedEach:
      remaining > 0 && unassignedCount > 0
        ? Math.floor(remaining / unassignedCount)
        : 0,
    expectedFromOthers,
    collected,
    outstanding,
    fullyAssigned,
    settled: fullyAssigned && outstanding === 0,
  };
}

// Bagi `amount` rata ke `count` orang dalam rupiah utuh. Sisa pembagian
// (paling banyak count - 1 rupiah) diberikan satu-satu dari orang pertama,
// sehingga jumlahnya selalu pas.
export function equalShares(amount: number, count: number): number[] {
  if (count <= 0 || amount <= 0) return [];
  const base = Math.floor(amount / count);
  const extra = amount - base * count;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? 1 : 0));
}

export type PersonTotal = {
  // kunci pengelompokan: nama tanpa spasi tepi dan huruf kecil
  key: string;
  name: string;
  billCount: number;
  owed: number;
  paid: number;
  outstanding: number;
  // jumlah talangan yang nominalnya belum ditentukan untuk orang ini
  unassigned: number;
};

// Rekap per orang di semua talangan. Nama yang sama (tanpa membedakan huruf
// besar-kecil) dianggap orang yang sama. Bagianmu sendiri tidak dihitung.
export function groupByPerson(
  bills: { members: SplitMemberInput[] }[]
): PersonTotal[] {
  const map = new Map<string, PersonTotal>();
  for (const bill of bills) {
    for (const m of bill.members) {
      if (m.isSelf) continue;
      const key = m.name.trim().toLowerCase();
      const row =
        map.get(key) ??
        {
          key,
          name: m.name.trim(),
          billCount: 0,
          owed: 0,
          paid: 0,
          outstanding: 0,
          unassigned: 0,
        };
      row.billCount += 1;
      if (m.amount === null) {
        row.unassigned += 1;
      } else {
        row.owed += m.amount;
        row.outstanding += Math.max(0, m.amount - m.paid);
      }
      row.paid += m.paid;
      map.set(key, row);
    }
  }
  return [...map.values()].sort(
    (a, b) => b.outstanding - a.outstanding || a.name.localeCompare(b.name)
  );
}
