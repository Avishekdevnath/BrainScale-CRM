import { describe, it, expect, beforeEach, vi } from "vitest";
import { startCallListImportCommit, processCallListImportCommitChunk } from "../call-list-import.service";

const mockPrisma = vi.hoisted(() => ({
  import: {
    findFirst: vi.fn(),
    update: vi.fn(),
  },
  callList: {
    findFirst: vi.fn(),
  },
  student: {
    findMany: vi.fn(),
    create: vi.fn(),
  },
  studentPhone: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
  callListItem: {
    findMany: vi.fn(),
    createMany: vi.fn(),
  },
  studentGroupStatus: {
    createMany: vi.fn(),
  },
  enrollment: {
    updateMany: vi.fn(),
    createMany: vi.fn(),
  },
  studentBatch: {
    createMany: vi.fn(),
  },
}));

vi.mock("../../../db/client", () => ({
  prisma: mockPrisma,
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("call-list-import batch commit", () => {
  it("initializes progress and cursor on start", async () => {
    mockPrisma.import.findFirst.mockResolvedValueOnce({
      id: "import-1",
      workspaceId: "ws-1",
      status: "PREVIEW",
      meta: {
        parsedData: {
          headers: ["name"],
          rows: [{ name: "A" }, { name: "B" }],
          totalRows: 2,
        },
        callListId: "list-1",
        userId: "user-1",
      },
    });

    mockPrisma.import.update.mockResolvedValueOnce({});

    const result = await startCallListImportCommit("list-1", "ws-1", "user-1", "import-1", {
      importId: "import-1",
      columnMapping: { name: "name" },
      matchBy: "email_or_phone",
      createNewStudents: true,
      skipDuplicates: true,
    } as any);

    expect(result.status).toBe("IN_PROGRESS");
    expect(result.progress.totalRows).toBe(2);
    expect(mockPrisma.import.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "import-1" },
        data: expect.objectContaining({
          status: "IN_PROGRESS",
          meta: expect.objectContaining({
            cursor: { nextIndex: 0 },
            progress: expect.objectContaining({ totalRows: 2, processedRows: 0 }),
          }),
        }),
      })
    );
  });

  it("completes immediately when cursor is at end", async () => {
    mockPrisma.import.findFirst.mockResolvedValueOnce({
      id: "import-1",
      workspaceId: "ws-1",
      status: "IN_PROGRESS",
      meta: {
        parsedData: {
          headers: ["name"],
          rows: [{ name: "A" }, { name: "B" }],
          totalRows: 2,
        },
        commitSettings: {
          importId: "import-1",
          columnMapping: { name: "name" },
          matchBy: "email_or_phone",
          createNewStudents: true,
          skipDuplicates: true,
        },
        cursor: { nextIndex: 2 },
        stats: { matched: 0, created: 0, added: 0, duplicates: 0, errors: 0, errorMessages: [] },
        callListId: "list-1",
        userId: "user-1",
      },
    });

    mockPrisma.import.update.mockResolvedValueOnce({});

    const result = await processCallListImportCommitChunk("list-1", "ws-1", "user-1", "import-1", 50);

    expect(result.status).toBe("COMPLETED");
    expect(mockPrisma.import.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "import-1" },
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    );
  });
});

