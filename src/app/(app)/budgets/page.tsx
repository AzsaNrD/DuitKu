import { redirect } from "next/navigation";

// Fitur Budget sudah digabung ke Alokasi (batas per kategori ada di rincian
// tiap pos); alamat lama dialihkan supaya bookmark/shortcut PWA tetap jalan.
export default function BudgetsPage() {
  redirect("/allocation");
}
