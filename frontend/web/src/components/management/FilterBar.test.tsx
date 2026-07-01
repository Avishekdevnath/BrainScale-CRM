import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FilterBar } from "./FilterBar";

describe("FilterBar", () => {
  it("calls onSearchChange as the user types", () => {
    const onSearchChange = vi.fn();
    render(
      <FilterBar
        searchValue=""
        onSearchChange={onSearchChange}
        activeFilterCount={0}
        open={false}
        onOpenChange={vi.fn()}
      >
        <div>popover content</div>
      </FilterBar>
    );
    fireEvent.change(screen.getByPlaceholderText("Search..."), { target: { value: "abc" } });
    expect(onSearchChange).toHaveBeenCalledWith("abc");
  });

  it("shows the active filter count badge when > 0", () => {
    render(
      <FilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        activeFilterCount={3}
        open={false}
        onOpenChange={vi.fn()}
      >
        <div>popover content</div>
      </FilterBar>
    );
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("does not render popover content when closed", () => {
    render(
      <FilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        activeFilterCount={0}
        open={false}
        onOpenChange={vi.fn()}
      >
        <div>popover content</div>
      </FilterBar>
    );
    expect(screen.queryByText("popover content")).not.toBeInTheDocument();
  });

  it("renders popover content when open, and toggles via the Filters button", () => {
    const onOpenChange = vi.fn();
    render(
      <FilterBar
        searchValue=""
        onSearchChange={vi.fn()}
        activeFilterCount={0}
        open={true}
        onOpenChange={onOpenChange}
      >
        <div>popover content</div>
      </FilterBar>
    );
    expect(screen.getByText("popover content")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Filters"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
