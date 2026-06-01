import { render, screen } from "@testing-library/react";
import { Button } from "./button";

test("does not apply fixed default height to link variant", () => {
  render(<Button variant="link">Read more</Button>);

  expect(screen.getByRole("button", { name: "Read more" })).not.toHaveClass("h-12");
});
