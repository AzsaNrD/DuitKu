// template (bukan layout) dibuat ulang tiap pindah halaman, jadi animasi
// masuk ini berjalan setiap navigasi, bukan cuma saat pertama dibuka
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
