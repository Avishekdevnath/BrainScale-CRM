import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Pencil, Trash2 } from "lucide-react";
import { RowActionsMenu } from "./RowActionsMenu";

// Radix's DropdownMenu.Trigger opens on pointerdown (checking button/pointerType),
// not plain click, so tests must dispatch a full pointer sequence in jsdom.
function openMenu(trigger: HTMLElement) {
  fireEvent.pointerDown(trigger, { button: 0, pointerType: "mouse" });
  fireEvent.pointerUp(trigger, { button: 0, pointerType: "mouse" });
  fireEvent.click(trigger);
}

describe("RowActionsMenu", () => {
  it("opens the menu and shows action labels on trigger click", () => {
    render(
      <RowActionsMenu
        actions={[
          { key: "edit", label: "Edit", icon: Pencil, onSelect: vi.fn() },
          { key: "delete", label: "Delete", icon: Trash2, onSelect: vi.fn(), variant: "destructive" },
        ]}
      />
    );
    openMenu(screen.getByRole("button", { name: /row actions/i }));
    expect(screen.getByText("Edit")).toBeInTheDocument();
    expect(screen.getByText("Delete")).toBeInTheDocument();
  });

  it("calls the action's onSelect when clicked", () => {
    const onSelect = vi.fn();
    render(
      <RowActionsMenu actions={[{ key: "edit", label: "Edit", icon: Pencil, onSelect }]} />
    );
    openMenu(screen.getByRole("button", { name: /row actions/i }));
    fireEvent.click(screen.getByText("Edit"));
    expect(onSelect).toHaveBeenCalledTimes(1);
  });
});
