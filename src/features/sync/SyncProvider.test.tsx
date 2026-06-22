import { describe, expect, test, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { SyncProvider, useSync } from "./SyncProvider";

function TestConsumer() {
  const { status } = useSync();
  return <div data-testid="status">{status.type}</div>;
}

describe("SyncProvider", () => {
  test("provides disconnected status by default", () => {
    render(
      <SyncProvider>
        <TestConsumer />
      </SyncProvider>,
    );
    expect(screen.getByTestId("status").textContent).toBe("disconnected");
  });

  test("useSync throws outside provider", () => {
    // Suppress console.error for expected React error boundary
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TestConsumer />)).toThrow();
    spy.mockRestore();
  });
});