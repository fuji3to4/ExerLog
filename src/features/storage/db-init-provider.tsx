"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { appDb } from "@/features/storage/app-db";
import { seedIfEmpty } from "@/features/storage/exercise-catalog.repository";
import { seedSelfCareCatalogIfEmpty } from "@/features/storage/self-care-catalog.repository";

import { SeedConfirmDialog } from "./components/seed-confirm-dialog";

type DbInitProviderProps = {
  children: ReactNode;
};

export function DbInitProvider({ children }: DbInitProviderProps) {
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);

  useEffect(() => {
    Promise.all([
      appDb.exercises.count().then((count) => {
        if (count === 0) setShowSeedConfirm(true);
      }),
      seedSelfCareCatalogIfEmpty(),
    ]).catch(console.error);
  }, []);

  async function handleConfirmSeed() {
    await seedIfEmpty();
    // Screens fetch exercises once on mount and don't observe DB changes,
    // so a reload is the simplest way to get the newly seeded data on screen.
    window.location.reload();
  }

  return (
    <>
      {children}
      {showSeedConfirm && (
        <SeedConfirmDialog
          onConfirm={() => void handleConfirmSeed()}
          onDecline={() => setShowSeedConfirm(false)}
        />
      )}
    </>
  );
}
