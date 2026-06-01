import { render, screen } from "@testing-library/react";
import { Separator } from "./separator";

test("renders radix separator with data-orientation attribute", () => {
  render(<Separator data-testid="separator" orientation="vertical" />);

  expect(screen.getByTestId("separator")).toHaveAttribute("data-orientation", "vertical");
});
