import { afterEach, describe, expect, it, vi } from "vitest";

import { fitWithin, resizeImage } from "./resize";

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("resizeImage", () => {
  it("paints the canvas white before drawing, so transparent pixels do not turn black in the JPEG", async () => {
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 10, height: 5, close: vi.fn() })),
    );
    const calls: string[] = [];
    const context = {
      fillStyle: "",
      fillRect: vi.fn(() => calls.push(`fillRect:${context.fillStyle}`)),
      drawImage: vi.fn(() => calls.push("drawImage")),
    };
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(context as never);
    vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation((callback) =>
      callback(new Blob(["jpeg"], { type: "image/jpeg" })),
    );

    const result = await resizeImage(new Blob(["png"], { type: "image/png" }));

    expect(calls).toEqual(["fillRect:#ffffff", "drawImage"]);
    expect(context.fillRect).toHaveBeenCalledWith(0, 0, 10, 5);
    expect(result).toMatchObject({ width: 10, height: 5 });
  });
});

describe("fitWithin", () => {
  it("fits the long edge to 1600 and never enlarges", () => {
    expect(fitWithin(4000, 3000)).toEqual({ width: 1600, height: 1200 });
    expect(fitWithin(3000, 4000)).toEqual({ width: 1200, height: 1600 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it("rounds to integers", () => {
    expect(fitWithin(3333, 1111)).toEqual({ width: 1600, height: 533 });
  });
});
