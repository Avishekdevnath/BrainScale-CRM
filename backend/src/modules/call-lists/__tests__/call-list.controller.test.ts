import { describe, it, expect, beforeEach, vi } from "vitest";

const listCallListItemsMock = vi.hoisted(() => vi.fn());

vi.mock("../call-list.service", () => ({
  listCallListItems: listCallListItemsMock,
}));

import { listCallListItems } from "../call-list.controller";

beforeEach(() => {
  vi.clearAllMocks();
  listCallListItemsMock.mockReset();
});

describe("call-list.controller listCallListItems", () => {
  it("passes Zod-validated query params to the service", async () => {
    listCallListItemsMock.mockResolvedValueOnce({ items: [], pagination: { page: 1, size: 25, total: 0, totalPages: 0 } });

    const req: any = {
      params: { listId: "list-1" },
      user: { workspaceId: "ws-1", sub: "user-1" },
      query: { page: "1", size: "25", followUpRequired: "true" },
      validatedData: { page: 1, size: 25, followUpRequired: true },
    };

    const res: any = { json: vi.fn() };
    const next = vi.fn();

    listCallListItems(req, res, next);
    await new Promise(setImmediate);

    expect(listCallListItemsMock).toHaveBeenCalledWith("list-1", "ws-1", req.validatedData);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        items: [],
        pagination: expect.any(Object),
      })
    );
    expect(next).not.toHaveBeenCalled();
  });
});

