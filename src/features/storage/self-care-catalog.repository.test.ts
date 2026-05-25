import { appDb } from "./app-db";
import { listAllSelfCareItems } from "./self-care-catalog.repository";

beforeEach(async () => {
  await appDb.selfCareCatalog.clear();
});

test("seeds the default self-care items once and returns them in sort order", async () => {
  const first = await listAllSelfCareItems();
  const second = await listAllSelfCareItems();

  expect(first.map((item) => item.id)).toEqual(["stretching", "walking", "bath", "meditation"]);
  expect(first.every((item) => item.isArchived === false)).toBe(true);
  expect(second.map((item) => item.id)).toEqual(["stretching", "walking", "bath", "meditation"]);
  expect(second.every((item) => item.isArchived === false)).toBe(true);
  expect(await appDb.selfCareCatalog.count()).toBe(4);
});
