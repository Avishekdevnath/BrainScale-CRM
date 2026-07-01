import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Layers } from "lucide-react";
import { ManagementPageHeader } from "./ManagementPageHeader";

describe("ManagementPageHeader", () => {
  it("renders title, subtitle, and icon", () => {
    render(
      <ManagementPageHeader icon={Layers} title="Batches" subtitle="Manage batches" />
    );
    expect(screen.getByText("Batches")).toBeInTheDocument();
    expect(screen.getByText("Manage batches")).toBeInTheDocument();
  });

  it("calls onRefresh when refresh button clicked", () => {
    const onRefresh = vi.fn();
    render(<ManagementPageHeader icon={Layers} title="Batches" onRefresh={onRefresh} />);
    fireEvent.click(screen.getByRole("button", { name: /refresh/i }));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("does not render a refresh button when onRefresh is omitted", () => {
    render(<ManagementPageHeader icon={Layers} title="Batches" />);
    expect(screen.queryByRole("button", { name: /refresh/i })).not.toBeInTheDocument();
  });

  it("renders actions slot content", () => {
    render(
      <ManagementPageHeader icon={Layers} title="Batches" actions={<button>Create Batch</button>} />
    );
    expect(screen.getByRole("button", { name: "Create Batch" })).toBeInTheDocument();
  });
});
