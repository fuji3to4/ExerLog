import { expect, test } from "vitest";

import { BUILTIN_IDS } from "@/features/modules/custom/builtin";
import { customTabName } from "@/features/modules/custom/data";
import { sheetTabs } from "@/features/sync/sync-config";

import { en } from "./en";
import { ja } from "./ja";

// Built-in record type tabs (Custom_wellness, ...) are labeled with their definition's name.
const typeTabs = new Set<string>(BUILTIN_IDS.map(customTabName));

test("every sheet tab has a sync_tab_ label in ja and en", () => {
  for (const tab of sheetTabs().filter((name) => !typeTabs.has(name))) {
    expect(ja, `ja sync_tab_${tab}`).toHaveProperty(`sync_tab_${tab}`);
    expect(en, `en sync_tab_${tab}`).toHaveProperty(`sync_tab_${tab}`);
  }
});
