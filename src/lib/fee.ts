// Biaya admin (biaya transfer, tarik tunai, top-up) disimpan sebagai
// pengeluaran terpisah di kategori "Biaya Admin" yang menunjuk transaksi
// induknya lewat transactions.fee_for_id. Dengan begitu saldo dompet asal
// berkurang sebesar nominal ditambah biaya, dan biayanya ikut terhitung di
// total pengeluaran, laporan, dan ekspor.
//
// Tanpa import supaya bisa dipakai server, klien, dan mode tanpa akun.

export const FEE_CATEGORY_NAME = "Biaya Admin";
export const FEE_CATEGORY_ICON = "hand-coins";
export const FEE_CATEGORY_COLOR = "#78716c";
export const FEE_NOTE = "Biaya admin";

// nominal yang sering muncul, hanya sebagai pintasan; bisa diubah bebas
export const FEE_PRESETS = [1_000, 2_500, 6_500];

// biaya hanya berlaku untuk uang yang keluar dari dompet
export function feeApplies(type: string): boolean {
  return type === "expense" || type === "transfer";
}
