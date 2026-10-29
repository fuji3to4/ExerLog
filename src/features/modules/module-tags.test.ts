import { afterEach, describe, expect, it, vi } from "vitest";
import { defaultOffModuleIds, defaultOnModuleTags, parseModuleTags } from "./module-tags";

afterEach(() => vi.unstubAllEnvs());

describe("module tags", () => {
  it("parses the env value loosely", () => {
    expect([...parseModuleTags(undefined)]).toEqual([]);
    expect([...parseModuleTags("")]).toEqual([]);
    expect([...parseModuleTags("  ,  ")]).toEqual([]);
    expect([...parseModuleTags("lymphedema")]).toEqual(["lymphedema"]);
    expect([...parseModuleTags(" Lymphedema , foo,lymphedema ")]).toEqual(["lymphedema"]);
  });

  it("reads NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS when called", () => {
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "lymphedema");
    expect([...defaultOnModuleTags()]).toEqual(["lymphedema"]);
    vi.stubEnv("NEXT_PUBLIC_DEFAULT_ON_MODULE_TAGS", "");
    expect([...defaultOnModuleTags()]).toEqual([]);
  });

  it("lists tagged modules whose tags are all off", () => {
    const modules = [
      { data: { id: "wellness" } },
      { data: { id: "selfcare" }, tags: ["lymphedema"] as const },
      { data: { id: "body" }, tags: [] as const },
      { data: { id: "symptoms" }, tags: ["lymphedema"] as const },
    ];
    expect(defaultOffModuleIds(modules, new Set())).toEqual(["selfcare", "symptoms"]);
    expect(defaultOffModuleIds(modules, new Set(["lymphedema"] as const))).toEqual([]);
  });
});
