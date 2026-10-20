"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { useTranslation } from "@/features/i18n/use-translation";
import { formatDuration } from "@/lib/date/duration";
import type { ExerciseLogResult } from "@/lib/types";

const CELEBRATION_MS = 1600;

export type CelebrateInput = { result: ExerciseLogResult; durationSeconds: number };
type Celebrate = (input: CelebrateInput) => void;

const noop: Celebrate = () => {};
const CelebrationContext = createContext<Celebrate>(noop);

export function useCelebrate(): Celebrate {
  return useContext(CelebrationContext);
}

export function CelebrationProvider({ children }: { children: ReactNode }) {
  const { t } = useTranslation();
  const [current, setCurrent] = useState<CelebrateInput | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const celebrate = useCallback<Celebrate>((input) => {
    if (typeof navigator !== "undefined") {
      navigator.vibrate?.(80);
    }
    if (timer.current) clearTimeout(timer.current);
    setCurrent(input);
    timer.current = setTimeout(() => {
      timer.current = null;
      setCurrent(null);
    }, CELEBRATION_MS);
  }, []);

  const message = current
    ? current.result === "did"
      ? t("celebration_did", { duration: formatDuration(current.durationSeconds) })
      : t("celebration_partial")
    : "";

  return (
    <CelebrationContext.Provider value={celebrate}>
      {children}
      <div className="celebration-overlay" aria-live="polite" data-active={current ? "true" : "false"}>
        {current ? (
          <div className="celebration-overlay__card">
            <span className="celebration-overlay__mark" aria-hidden="true">💮</span>
            <span className="celebration-overlay__text">{message}</span>
          </div>
        ) : null}
      </div>
    </CelebrationContext.Provider>
  );
}
