"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TransactionFormDialog } from "@/components/transaction-form-dialog";
import type { Category, Wallet } from "@/db/schema";

export function QuickAddButton({
  wallets,
  categories,
}: {
  wallets: Pick<Wallet, "id" | "name">[];
  categories: Pick<Category, "id" | "name" | "type">[];
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setOpen(true)} disabled={wallets.length === 0}>
        <Plus /> Catat Transaksi
      </Button>
      {open && (
        <TransactionFormDialog
          open={open}
          onOpenChange={setOpen}
          wallets={wallets}
          categories={categories}
        />
      )}
    </>
  );
}
