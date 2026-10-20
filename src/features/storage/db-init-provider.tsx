"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

import { appDb } from "@/features/storage/app-db";
import { seedIfEmpty } from "@/features/storage/exercise-catalog.repository";
import { seedSelfCareCatalogIfEmpty } from "@/features/storage/self-care-catalog.repository";
import { syncIfNeeded } from "@/features/sync/auto-sync";

import { SeedConfirmDialog } from "./components/seed-confirm-dialog";

/**
 * Whether to offer the starter exercises. The seed is stamped with
 * updatedAt=now, so it would beat every remote edit and tombstone; when
 * connected to Google we therefore sync first and only offer it if the
 * library is still empty. A failed sync defers the offer to a later launch.
 */
async function shouldOfferExerciseSeed(): Promise<boolean> {
  if ((await appDb.exercises.count()) > 0) return false;
  const outcome = await syncIfNeeded().catch((err: unknown) => {
    console.error("[db-init] sync before seed failed", err);
    return "failed" as const;
  });
  if (outcome === "failed") return false;
  return (await appDb.exercises.count()) === 0;
}

type DbInitProviderProps = {
  children: ReactNode;
};

export function DbInitProvider({ children }: DbInitProviderProps) {
  const [showSeedConfirm, setShowSeedConfirm] = useState(false);

  useEffect(() => {
    Promise.all([
      shouldOfferExerciseSeed().then((offer) => {
        if (offer) setShowSeedConfirm(true);
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
