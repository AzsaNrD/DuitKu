// Pemakaian sebuah dompet oleh data lain. Dipakai untuk memutuskan apakah
// dompet aman dihapus. Tanpa import supaya bisa dipakai server, klien, dan
// mode tanpa akun dengan hasil yang sama.
//
// Menghapus dompet ikut menghapus semua transaksinya, termasuk transfer dari
// dompet lain ke dompet itu. Akibatnya saldo dompet lain berubah diam-diam,
// jadi dompet yang punya transfer, jadwal berulang, impian, atau pos
// Alokasi tidak boleh dihapus sebelum keterkaitannya dilepas.

export type WalletUsage = {
  // pemasukan, pengeluaran, dan penyesuaian di dompet ini
  transactions: number;
  // transfer masuk atau keluar (menyentuh dompet lain)
  transfers: number;
  goals: number;
  buckets: number;
  recurring: number;
};

export const EMPTY_WALLET_USAGE: WalletUsage = {
  transactions: 0,
  transfers: 0,
  goals: 0,
  buckets: 0,
  recurring: 0,
};

// Alasan dompet belum boleh dihapus. Kosong berarti boleh dihapus.
export function walletDeleteBlockers(usage: WalletUsage): string[] {
  const reasons: string[] = [];
  if (usage.transfers > 0) {
    reasons.push(
      `${usage.transfers} transfer dengan dompet lain. Hapus transfernya dulu di halaman Transaksi, kalau tidak saldo dompet lain ikut berubah.`
    );
  }
  if (usage.recurring > 0) {
    reasons.push(
      `${usage.recurring} jadwal berulang memakai dompet ini. Hapus atau ubah jadwalnya dulu.`
    );
  }
  if (usage.goals > 0) {
    reasons.push(
      `${usage.goals} impian mengikuti saldo dompet ini. Ubah sumber progres impiannya dulu.`
    );
  }
  if (usage.buckets > 0) {
    reasons.push(
      "Dompet ini terhubung ke pos Alokasi. Lepaskan dulu di halaman Alokasi."
    );
  }
  return reasons;
}

export function walletDeleteBlockedMessage(usage: WalletUsage): string | null {
  const reasons = walletDeleteBlockers(usage);
  if (reasons.length === 0) return null;
  return `Dompet belum bisa dihapus. ${reasons[0]}`;
}
