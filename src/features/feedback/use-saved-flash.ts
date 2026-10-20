"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export const SAVED_FLASH_MS = 1500;

export function useSavedFlash(): { isSaved: boolean; flash: () => void } {
  const [isSaved, setIsSaved] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const flash = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setIsSaved(true);
    timer.current = setTimeout(() => {
      timer.current = null;
      setIsSaved(false);
    }, SAVED_FLASH_MS);
  }, []);

  return { isSaved, flash };
}
