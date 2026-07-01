import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { StatusTabBar } from "./StatusTabBar";

const tabs = [
  { id: "all", label: "All", count: 10 },
  { id: "active", label: "Active", count: 7 },
  { id: "inactive", label: "Inactive", count: 3 },
];

describe("StatusTabBar", () => {
  it("renders all tab labels and counts", () => {
    render(<StatusTabBar tabs={tabs} activeId="all" onChange={vi.fn()} />);
    expect(screen.getByText("All")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("calls onChange with the clicked tab id", () => {
    const onChange = vi.fn();
    render(<StatusTabBar tabs={tabs} activeId="all" onChange={onChange} />);
    fireEvent.click(screen.getByText("Active"));
    expect(onChange).toHaveBeenCalledWith("active");
  });

  it("marks the active tab distinctly from inactive tabs", () => {
    render(<StatusTabBar tabs={tabs} activeId="active" onChange={vi.fn()} />);
    const activeButton = screen.getByText("Active").closest("button")!;
    const inactiveButton = screen.getByText("All").closest("button")!;
    expect(activeButton.className).not.toBe(inactiveButton.className);
  });
});
