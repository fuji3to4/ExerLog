"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { seedIfEmpty } from "@/features/storage/exercise-catalog.repository";

type DbInitProviderProps = {
  children: ReactNode;
};

export function DbInitProvider({ children }: DbInitProviderProps) {
  useEffect(() => {
    void seedIfEmpty();
  }, []);

  return <>{children}</>;
}
