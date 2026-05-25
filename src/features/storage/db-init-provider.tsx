"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { seedIfEmpty } from "@/features/storage/exercise-catalog.repository";
import { seedSelfCareCatalogIfEmpty } from "@/features/storage/self-care-catalog.repository";

type DbInitProviderProps = {
  children: ReactNode;
};

export function DbInitProvider({ children }: DbInitProviderProps) {
  useEffect(() => {
    void Promise.all([seedIfEmpty(), seedSelfCareCatalogIfEmpty()]);
  }, []);

  return <>{children}</>;
}
