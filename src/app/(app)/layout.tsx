import Link from "next/link";
import { Wallet } from "lucide-react";
import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import { SidebarNav, BottomNav } from "@/components/nav-links";
import { BalanceToggle } from "@/components/balance-toggle";
import { ThemeToggle } from "@/components/theme-toggle";
import { UserMenu } from "@/components/user-menu";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  return (
    <SessionProvider>
      <div className="flex min-h-screen w-full">
        {/* Sidebar (desktop) */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r bg-background p-5 md:flex">
          <Link
            href="/dashboard"
            className="mb-8 flex items-center gap-2.5 px-2 text-lg font-bold tracking-tight"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <Wallet className="h-4 w-4" />
            </span>
            DuitKu
          </Link>
          <SidebarNav />
        </aside>

        {/* min-w-0 agar kolom boleh menyusut — tanpa ini teks panjang
            (truncate) memaksa halaman melebar & muncul scroll horizontal */}
        <div className="flex min-w-0 flex-1 flex-col md:pl-64">
          {/* Header */}
          <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/80 px-4 backdrop-blur md:px-6">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 font-bold md:hidden"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Wallet className="h-4 w-4" />
              </span>
              DuitKu
            </Link>
            <div className="ml-auto flex items-center gap-1">
              <BalanceToggle />
              <ThemeToggle />
              <UserMenu
                name={session?.user?.name}
                email={session?.user?.email}
                image={session?.user?.image}
              />
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl flex-1 p-4 pb-24 md:p-8 md:pb-10">
            {children}
          </main>
        </div>

        <BottomNav />
      </div>
    </SessionProvider>
  );
}
