import { expect, test } from "vitest";

import { sheetTabs } from "@/features/sync/sync-config";

import { en } from "./en";
import { ja } from "./ja";

test("every sheet tab has a sync_tab_ label in ja and en", () => {
  for (const tab of sheetTabs()) {
    expect(ja, `ja sync_tab_${tab}`).toHaveProperty(`sync_tab_${tab}`);
    expect(en, `en sync_tab_${tab}`).toHaveProperty(`sync_tab_${tab}`);
  }
});
