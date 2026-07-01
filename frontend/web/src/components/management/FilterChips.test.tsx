import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterChips } from "./FilterChips";

describe("FilterChips", () => {
  it("renders nothing when chips is empty", () => {
    const { container } = render(<FilterChips chips={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a chip per entry with its label", () => {
    render(
      <FilterChips
        chips={[
          { key: "status", label: "Status: Active", onRemove: vi.fn() },
          { key: "search", label: "Search: foo", onRemove: vi.fn() },
        ]}
      />
    );
    expect(screen.getByText("Status: Active")).toBeInTheDocument();
    expect(screen.getByText("Search: foo")).toBeInTheDocument();
  });

  it("calls the chip's onRemove when its X is clicked", () => {
    const onRemove = vi.fn();
    render(<FilterChips chips={[{ key: "status", label: "Status: Active", onRemove }]} />);
    fireEvent.click(screen.getByRole("button"));
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it("shows Clear all only when more than one chip and onClearAll provided", () => {
    const onClearAll = vi.fn();
    render(
      <FilterChips
        chips={[
          { key: "a", label: "A", onRemove: vi.fn() },
          { key: "b", label: "B", onRemove: vi.fn() },
        ]}
        onClearAll={onClearAll}
      />
    );
    fireEvent.click(screen.getByText("Clear all"));
    expect(onClearAll).toHaveBeenCalledTimes(1);
  });
});
