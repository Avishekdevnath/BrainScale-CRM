import { describe, it, expect, beforeEach, vi } from "vitest";
import { listCallListItems } from "../call-list.service";

const mockPrisma = vi.hoisted(() => ({
  callList: { findFirst: vi.fn() },
  callListItem: { count: vi.fn(), findMany: vi.fn() },
  callLog: { findMany: vi.fn() },
}));

vi.mock("../../../db/client", () => ({
  prisma: mockPrisma,
}));

beforeEach(() => {
  vi.clearAllMocks();
  mockPrisma.callList.findFirst.mockReset();
  mockPrisma.callListItem.count.mockReset();
  mockPrisma.callListItem.findMany.mockReset();
  mockPrisma.callLog.findMany.mockReset();
});

describe("listCallListItems", () => {
  it("includes workspaceId in callListItem query for tenant isolation", async () => {
    mockPrisma.callList.findFirst.mockResolvedValueOnce({ id: "list-1" });
    mockPrisma.callListItem.count.mockResolvedValueOnce(0);
    mockPrisma.callListItem.findMany.mockResolvedValueOnce([]);
    mockPrisma.callLog.findMany.mockResolvedValueOnce([]);

    await listCallListItems("list-1", "ws-1", { page: 1, size: 25 } as any);

    expect(mockPrisma.callListItem.count).toHaveBeenCalledWith({
      where: expect.objectContaining({ callListId: "list-1", workspaceId: "ws-1" }),
    });
    expect(mockPrisma.callListItem.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ callListId: "list-1", workspaceId: "ws-1" }),
      })
    );
  });

  it("returns empty result when call-log filters match no logs", async () => {
    mockPrisma.callList.findFirst.mockResolvedValueOnce({ id: "list-1" });
    mockPrisma.callLog.findMany.mockResolvedValueOnce([]);

    const result = await listCallListItems("list-1", "ws-1", {
      page: 1,
      size: 1000,
      callLogStatus: "completed",
    } as any);

    expect(result).toEqual({
      items: [],
      pagination: { page: 1, size: 1000, total: 0, totalPages: 0 },
    });
    expect(mockPrisma.callListItem.count).not.toHaveBeenCalled();
    expect(mockPrisma.callListItem.findMany).not.toHaveBeenCalled();
  });
});

