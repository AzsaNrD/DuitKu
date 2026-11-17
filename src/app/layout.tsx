import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/sonner";
import { ConnectionStatus } from "@/components/connection-status";
import "./globals.css";

const jakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "DuitKu | Catatan Keuangan Pribadi",
    template: "%s | DuitKu",
  },
  description:
    "Aplikasi keuangan pribadi untuk mencatat uang masuk & keluar, kelola dompet, alokasi gaji, impian, dan laporan bulanan.",
  appleWebApp: {
    capable: true,
    title: "DuitKu",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: "/icons/icon-192.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f5f5f7" },
    { media: "(prefers-color-scheme: dark)", color: "#0b1220" },
  ],
  // keyboard HP ikut menyusutkan viewport, supaya dialog (max-h dvh)
  // ter-clamp dan bisa di-scroll, tidak terpotong di balik keyboard
  interactiveWidget: "resizes-content",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="id"
      suppressHydrationWarning
      className={`${jakarta.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        {/* set atribut hide-balance sebelum paint supaya tidak
            sempat terlihat sekejap saat preferensinya "sembunyi" */}
        <script
          dangerouslySetInnerHTML={{
            __html:
              "try{if(localStorage.getItem('hide-balance')==='1')document.documentElement.setAttribute('data-hide-balance','true')}catch(e){}",
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
          <ConnectionStatus />
        </ThemeProvider>
      </body>
    </html>
  );
}
