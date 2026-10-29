import { render, screen } from "@testing-library/react";
import { Button, buttonVariants } from "./button";

test("does not apply fixed default height to link variant", () => {
  render(<Button variant="link">Read more</Button>);

  expect(screen.getByRole("button", { name: "Read more" })).not.toHaveClass("h-12");
});

test("default variant is tonal, not a solid fill", () => {
  const cls = buttonVariants();
  expect(cls).toContain("bg-[var(--tonal-bg)]");
  expect(cls).toContain("text-[var(--tonal-text)]");
  expect(cls).not.toContain("bg-primary ");
  expect(cls).not.toContain("shadow-sm");
});

test("buttons are 36px with 13px text and keep focus ring and disabled styles", () => {
  const cls = buttonVariants();
  expect(cls).toContain("h-9");
  expect(cls).toContain("text-[0.8125rem]");
  expect(cls).toContain("focus-visible:ring-2");
  expect(cls).toContain("disabled:opacity-50");
  expect(cls).not.toContain("min-h-12");
  expect(buttonVariants({ size: "sm" })).toContain("h-8");
  expect(buttonVariants({ size: "icon" })).toContain("size-9");
});

test("secondary/outline have no fill and destructive is tonal red", () => {
  for (const variant of ["secondary", "outline"] as const) {
    const cls = buttonVariants({ variant });
    expect(cls).toContain("bg-transparent");
    expect(cls).toContain("border-border");
  }
  const destructive = buttonVariants({ variant: "destructive" });
  expect(destructive).toContain("bg-[var(--danger-bg)]");
  expect(destructive).not.toContain("bg-destructive");
});
