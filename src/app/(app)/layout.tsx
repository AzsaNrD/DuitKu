import Link from "next/link";
import { Wallet } from "lucide-react";
import { auth } from "@/auth";
import { SessionProvider } from "next-auth/react";
import { SidebarNav, BottomNav } from "@/components/nav-links";
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
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r bg-background p-4 md:flex">
          <Link
            href="/dashboard"
            className="mb-6 flex items-center gap-2 px-2 text-lg font-bold"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Wallet className="h-4 w-4" />
            </span>
            DuitKu
          </Link>
          <SidebarNav />
        </aside>

        <div className="flex flex-1 flex-col md:pl-60">
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
              <ThemeToggle />
              <UserMenu
                name={session?.user?.name}
                email={session?.user?.email}
                image={session?.user?.image}
              />
            </div>
          </header>

          <main className="flex-1 p-4 pb-20 md:p-6 md:pb-6">{children}</main>
        </div>

        <BottomNav />
      </div>
    </SessionProvider>
  );
}
