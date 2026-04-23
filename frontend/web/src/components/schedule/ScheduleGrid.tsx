"use client";

import { useCallback, useEffect, useRef, useMemo, useState } from "react";
import { mutate } from "swr";
import { apiClient } from "@/lib/api-client";
import { useScheduleTemplate } from "@/hooks/useSchedule";
import { useWorkspaceMembers } from "@/hooks/useMembers";
import { useWorkspaceStore } from "@/store/workspace";
import type { WorkspaceMember } from "@/types/members.types";
import type { SaveScheduleTemplatePayload } from "@/types/schedule.types";
import { EditableMemberCell } from "./EditableMemberCell";
import { BroadcastScheduleModal } from "./BroadcastScheduleModal";
import { Download, FileSpreadsheet, FileText, Image, Mail } from "lucide-react";

const DAY_ROWS = [
  { label: "Saturday", dayOfWeek: 6 },
  { label: "Sunday", dayOfWeek: 0 },
  { label: "Monday", dayOfWeek: 1 },
  { label: "Tuesday", dayOfWeek: 2 },
  { label: "Wednesday", dayOfWeek: 3 },
  { label: "Thursday", dayOfWeek: 4 },
  { label: "Friday", dayOfWeek: 5 },
] as const;

const SUPPORT_SESSION_ALIASES = new Set(["support session", "support"]);
const GROUP_MONITORING_ALIASES = new Set(["group monitoring", "monitoring"]);

type ColumnKey = {
  slotGroup: string;
  slotLabel: string;
  startTime: string;
  endTime: string;
  order: number;
};

type SlotInfo = {
  id?: string;
  dayOfWeek: number;
  batchId: string | null;
  slotGroup: string;
  slotLabel: string;
  order: number;
  startTime: string;
  endTime: string;
};

const DEFAULT_SUPPORT_COLUMNS: ColumnKey[] = [
  { slotGroup: "Support Session", slotLabel: "Morning (11-1)", startTime: "11:00", endTime: "13:00", order: 10 },
  { slotGroup: "Support Session", slotLabel: "AfterNoon (4-6)", startTime: "16:00", endTime: "18:00", order: 20 },
  { slotGroup: "Support Session", slotLabel: "Night (9-11)", startTime: "21:00", endTime: "23:00", order: 30 },
  { slotGroup: "Support Session", slotLabel: "Conceptual Session (10-11.30)", startTime: "10:00", endTime: "11:30", order: 40 },
];

const DEFAULT_MONITORING_COLUMNS: ColumnKey[] = [
  { slotGroup: "Group Monitoring", slotLabel: "Morning (10-12.30)", startTime: "10:00", endTime: "12:30", order: 110 },
  { slotGroup: "Group Monitoring", slotLabel: "Noon (1.00-3.30)", startTime: "13:00", endTime: "15:30", order: 120 },
  { slotGroup: "Group Monitoring", slotLabel: "AfterNoon (3.30-6.00)", startTime: "15:30", endTime: "18:00", order: 130 },
  { slotGroup: "Group Monitoring", slotLabel: "AfterNoon (6.00-8.30)", startTime: "18:00", endTime: "20:30", order: 140 },
  { slotGroup: "Group Monitoring", slotLabel: "Night (8.30-10.30)", startTime: "20:30", endTime: "22:30", order: 150 },
  { slotGroup: "Group Monitoring", slotLabel: "Night (10.30-12.30)", startTime: "22:30", endTime: "00:30", order: 160 },
];

const DEFAULT_COLUMNS: ColumnKey[] = [...DEFAULT_SUPPORT_COLUMNS, ...DEFAULT_MONITORING_COLUMNS];

const buildColumnKey = (column: Pick<ColumnKey, "slotGroup" | "slotLabel" | "order">) =>
  `${column.slotGroup}|${column.slotLabel}|${column.order}`;

const buildCellKey = (dayOfWeek: number, batchId: string, columnKey: string) =>
  `${dayOfWeek}|${batchId}|${columnKey}`;

const normalizeGroup = (value: string) => value.trim().toLowerCase();

const batchPillClass = (name: string) => {
  const lower = name.toLowerCase();
  if (lower.includes("05")) return "bg-[#E2F0D9]";
  if (lower.includes("06")) return "bg-[#DEEBF7]";
  return "bg-gray-100";
};

const DEFAULT_COL_WIDTH = 120; // px
const DEFAULT_WIDTHS: Record<string, number> = {
  __day__: 80,
  __batch__: 140,
};

/** Returns column widths state + a resize-handle props factory.
 *  Uses a ref for widths so mouse-move callbacks are never stale. */
function useColumnResize() {
  const [widths, setWidths] = useState<Record<string, number>>({});
  // Keep a ref in sync so mousemove sees the latest values without re-creating handlers
  const widthsRef = useRef<Record<string, number>>({});
  widthsRef.current = widths;

  const dragging = useRef<{ key: string; startX: number; startW: number } | null>(null);

  const getWidth = useCallback(
    (key: string) => widthsRef.current[key] ?? DEFAULT_WIDTHS[key] ?? DEFAULT_COL_WIDTH,
    []
  );

  const onMouseDown = useCallback(
    (key: string) =>
      (e: React.MouseEvent) => {
        e.preventDefault();
        dragging.current = { key, startX: e.clientX, startW: widthsRef.current[key] ?? DEFAULT_WIDTHS[key] ?? DEFAULT_COL_WIDTH };

        const onMove = (ev: MouseEvent) => {
          if (!dragging.current) return;
          const delta = ev.clientX - dragging.current.startX;
          const newW = Math.max(60, dragging.current.startW + delta);
          setWidths((prev) => ({ ...prev, [dragging.current!.key]: newW }));
        };

        const onUp = () => {
          dragging.current = null;
          window.removeEventListener("mousemove", onMove);
          window.removeEventListener("mouseup", onUp);
        };

        window.addEventListener("mousemove", onMove);
        window.addEventListener("mouseup", onUp);
      },
    []
  );

  return { getWidth, onMouseDown };
}

/** A small dropdown button offering PDF / Excel / Image export options. */
function ExportMenu({
  onExcelExport,
  onPdfExport,
  onImageExport,
}: {
  onExcelExport: () => void;
  onPdfExport: () => void;
  onImageExport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const run = (fn: () => void) => {
    setOpen(false);
    fn();
  };

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
      >
        <Download size={14} />
        Export
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 rounded-lg border border-slate-200 bg-white shadow-lg py-1">
          <button
            type="button"
            onClick={() => run(onExcelExport)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <FileSpreadsheet size={15} className="text-green-600" />
            Export as Excel
          </button>
          <button
            type="button"
            onClick={() => run(onPdfExport)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <FileText size={15} className="text-red-500" />
            Export as PDF
          </button>
          <button
            type="button"
            onClick={() => run(onImageExport)}
            className="flex w-full items-center gap-2.5 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            <Image size={15} className="text-blue-500" />
            Export as Image
          </button>
        </div>
      )}
    </div>
  );
}

/** A <th> with a drag handle on its right edge.
 *  Width is controlled via <colgroup> — only the drag handle lives here. */
function ResizableHeader({
  label,
  colKey,
  onMouseDown,
  className = "",
}: {
  label: string;
  colKey: string;
  onMouseDown: (k: string) => (e: React.MouseEvent) => void;
  className?: string;
}) {
  return (
    <th
      className={`relative border-2 border-black bg-[#6B8B9B] px-1.5 py-1.5 text-white select-none overflow-hidden ${className}`}
    >
      <span className="block truncate text-xs leading-tight">{label}</span>
      {/* resize handle — sits on the right edge */}
      <div
        onMouseDown={onMouseDown(colKey)}
        className="absolute right-0 top-0 h-full w-2 cursor-col-resize hover:bg-white/30 z-10"
      />
    </th>
  );
}

export function ScheduleGrid() {
  const workspaceId = useWorkspaceStore((state) => state.current?.id ?? null);
  const { members } = useWorkspaceMembers(workspaceId);
  const { data, isLoading, error } = useScheduleTemplate();
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [isBroadcasting, setIsBroadcasting] = useState(false);

  // draft: cellKey → string[] of member IDs
  const [draft, setDraft] = useState<Record<string, string[]>>({});

  // column resize
  const { getWidth, onMouseDown } = useColumnResize();

  // ── Derived data ────────────────────────────────────────────────────────

  const columns = useMemo(() => {
    if (!data || data.slots.length === 0) return DEFAULT_COLUMNS;
    const unique = new Map<string, ColumnKey>();
    for (const slot of data.slots) {
      const key = buildColumnKey(slot);
      if (!unique.has(key)) {
        unique.set(key, {
          slotGroup: slot.slotGroup,
          slotLabel: slot.slotLabel,
          startTime: slot.startTime,
          endTime: slot.endTime,
          order: slot.order,
        });
      }
    }
    const resolved = Array.from(unique.values()).sort((a, b) => a.order - b.order);
    return resolved.length > 0 ? resolved : DEFAULT_COLUMNS;
  }, [data]);

  const { supportColumns, monitoringColumns } = useMemo(() => {
    const support = columns.filter((col) => SUPPORT_SESSION_ALIASES.has(normalizeGroup(col.slotGroup)));
    const monitoring = columns.filter((col) => GROUP_MONITORING_ALIASES.has(normalizeGroup(col.slotGroup)));
    const fallback = columns.filter(
      (col) =>
        !SUPPORT_SESSION_ALIASES.has(normalizeGroup(col.slotGroup)) &&
        !GROUP_MONITORING_ALIASES.has(normalizeGroup(col.slotGroup))
    );
    return {
      supportColumns: support.length > 0 ? support : columns.slice(0, Math.ceil(columns.length / 2)),
      monitoringColumns:
        monitoring.length > 0 ? monitoring : fallback.length > 0 ? fallback : columns.slice(Math.ceil(columns.length / 2)),
    };
  }, [columns]);

  const allVisibleColumns = useMemo(() => [...supportColumns, ...monitoringColumns], [supportColumns, monitoringColumns]);

  /** slotId → member IDs from saved data */
  const assignmentsBySlot = useMemo(() => {
    if (!data) return new Map<string, string[]>();
    const map = new Map<string, string[]>();
    for (const assignment of data.assignments) {
      const current = map.get(assignment.slotId) ?? [];
      current.push(assignment.memberId);
      map.set(assignment.slotId, current);
    }
    return map;
  }, [data]);

  /** cellKey → SlotInfo */
  const slotsByCell = useMemo(() => {
    if (!data) return new Map<string, SlotInfo>();
    const map = new Map<string, SlotInfo>();
    for (const slot of data.slots) {
      if (!slot.batchId) continue;
      const colKey = buildColumnKey(slot);
      map.set(buildCellKey(slot.dayOfWeek, slot.batchId, colKey), slot);
    }
    return map;
  }, [data]);

  const getCellSlot = (dayOfWeek: number, batchId: string, column: ColumnKey): SlotInfo => {
    const colKey = buildColumnKey(column);
    const cellKey = buildCellKey(dayOfWeek, batchId, colKey);
    return (
      slotsByCell.get(cellKey) ?? {
        dayOfWeek,
        batchId,
        slotGroup: column.slotGroup,
        slotLabel: column.slotLabel,
        startTime: column.startTime,
        endTime: column.endTime,
        order: column.order,
      }
    );
  };

  /** Get saved member IDs for a cell */
  const getSavedMemberIds = (slot: SlotInfo): string[] => {
    if (!slot.id) return [];
    return assignmentsBySlot.get(slot.id) ?? [];
  };

  /** Get current (draft or saved) member IDs for a cell */
  const getCellMemberIds = (cellKey: string, slot: SlotInfo): string[] => {
    return draft[cellKey] ?? getSavedMemberIds(slot);
  };

  // ── Unsaved changes tracking ────────────────────────────────────────────

  const hasUnsavedChanges = useMemo(
    () =>
      Object.entries(draft).some(([cellKey, draftIds]) => {
        const slot = slotsByCell.get(cellKey);
        const savedIds = slot ? getSavedMemberIds(slot) : [];
        return JSON.stringify([...draftIds].sort()) !== JSON.stringify([...savedIds].sort());
      }),
    [draft, slotsByCell, assignmentsBySlot]
  );

  useEffect(() => {
    if (!hasUnsavedChanges) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasUnsavedChanges]);

  // ── Actions ─────────────────────────────────────────────────────────────

  const handleCellChange = (cellKey: string, memberIds: string[]) => {
    setDraft((prev) => ({ ...prev, [cellKey]: memberIds }));
    setSaveError(null);
  };

  const resetDraft = () => {
    setDraft({});
    setSaveError(null);
  };

  const toggleEditMode = () => {
    if (isEditing && hasUnsavedChanges) {
      const discard = window.confirm("You have unsaved changes. Switch to view mode and discard them?");
      if (!discard) return;
    }
    setDraft({});
    setSaveError(null);
    setIsEditing((v) => !v);
  };

  const saveTemplate = async () => {
    if (!data) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload: SaveScheduleTemplatePayload = { slots: [], assignments: [] };

      for (const { dayOfWeek } of DAY_ROWS) {
        for (const batch of data.batches) {
          for (const column of allVisibleColumns) {
            const slot = getCellSlot(dayOfWeek, batch.id, column);

            payload.slots.push({
              dayOfWeek: slot.dayOfWeek,
              batchId: slot.batchId,
              slotGroup: slot.slotGroup,
              slotLabel: slot.slotLabel,
              startTime: slot.startTime,
              endTime: slot.endTime,
              order: slot.order,
            });

            const colKey = buildColumnKey(column);
            const cellKey = buildCellKey(dayOfWeek, batch.id, colKey);
            const memberIds = getCellMemberIds(cellKey, slot);

            for (const memberId of memberIds) {
              payload.assignments.push({
                dayOfWeek: slot.dayOfWeek,
                batchId: slot.batchId,
                slotLabel: slot.slotLabel,
                order: slot.order,
                memberId,
              });
            }
          }
        }
      }

      await apiClient.saveScheduleTemplate(payload);
      setDraft({});
      setIsEditing(false);
      await mutate((key) => typeof key === "string" && key.includes("schedule-template"));
    } catch (err: any) {
      setSaveError(err?.message || "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  // ── Export helpers ───────────────────────────────────────────────────────

  /** Resolve member names for a cell */
  const getMemberNames = (cellKey: string, slot: SlotInfo): string => {
    const ids = getCellMemberIds(cellKey, slot);
    if (ids.length === 0) return "";
    return ids
      .map((id) => {
        const m = members.find((m) => m.id === id);
        return m?.user.name?.trim() || m?.user.email || id;
      })
      .join(", ");
  };

  /** Build the table data as a 2D string array for export */
  const buildExportRows = () => {
    // Group header row
    const groupHeaderRow = [
      "",
      "",
      ...supportColumns.map((_, i) => (i === 0 ? "Support Session" : "")),
      "",
      ...monitoringColumns.map((_, i) => (i === 0 ? "Group Monitoring" : "")),
    ];

    // Column header row
    const colHeaderRow = [
      "Day",
      "Batch",
      ...supportColumns.map((c) => c.slotLabel),
      "",
      ...monitoringColumns.map((c) => c.slotLabel),
    ];

    const dataRows: string[][] = [];

    for (const { dayOfWeek, label: dayLabel } of DAY_ROWS) {
      if (!data) continue;
      for (let i = 0; i < data.batches.length; i++) {
        const batch = data.batches[i];
        const row: string[] = [
          i === 0 ? dayLabel : "",
          batch.name,
        ];

        for (const col of supportColumns) {
          const colKey = buildColumnKey(col);
          const cellKey = buildCellKey(dayOfWeek, batch.id, colKey);
          const slot = getCellSlot(dayOfWeek, batch.id, col);
          row.push(getMemberNames(cellKey, slot));
        }

        row.push(""); // separator column

        for (const col of monitoringColumns) {
          const colKey = buildColumnKey(col);
          const cellKey = buildCellKey(dayOfWeek, batch.id, colKey);
          const slot = getCellSlot(dayOfWeek, batch.id, col);
          row.push(getMemberNames(cellKey, slot));
        }

        dataRows.push(row);
      }
    }

    return { groupHeaderRow, colHeaderRow, dataRows };
  };

  const exportExcel = async () => {
    const XLSX = await import("xlsx");
    const { groupHeaderRow, colHeaderRow, dataRows } = buildExportRows();

    const ws = XLSX.utils.aoa_to_sheet([groupHeaderRow, colHeaderRow, ...dataRows]);

    // Merge group header cells
    const supportStart = 2;
    const supportEnd = supportStart + supportColumns.length - 1;
    const separatorIdx = supportEnd + 1;
    const monitoringStart = separatorIdx + 1;
    const monitoringEnd = monitoringStart + monitoringColumns.length - 1;

    ws["!merges"] = [
      { s: { r: 0, c: supportStart }, e: { r: 0, c: supportEnd } },
      { s: { r: 0, c: monitoringStart }, e: { r: 0, c: monitoringEnd } },
    ];

    // Column widths
    ws["!cols"] = [
      { wch: 12 }, // Day
      { wch: 14 }, // Batch
      ...supportColumns.map(() => ({ wch: 22 })),
      { wch: 2 },  // separator
      ...monitoringColumns.map(() => ({ wch: 22 })),
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Weekly Duty Schedule");
    XLSX.writeFile(wb, "team-duty-schedule.xlsx");
  };

  const exportPDF = async () => {
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const { colHeaderRow, dataRows } = buildExportRows();

    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a3" });

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.text("Team Weekly Duty Schedule", 14, 16);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Saturday to Friday · all active batches", 14, 22);

    const totalCols = colHeaderRow.length;
    const supportSpan = supportColumns.length;
    const monitoringSpan = monitoringColumns.length;
    const supportStartCol = 2;
    const monitoringStartCol = supportStartCol + supportSpan + 1; // +1 for separator

    // Build head: group row + column row
    const head = [
      [
        { content: "", colSpan: 2, styles: { fillColor: [107, 139, 155] as [number,number,number], textColor: 255 } },
        { content: "Support Session", colSpan: supportSpan, styles: { fillColor: [107, 139, 155] as [number,number,number], textColor: 255, halign: "center" as const } },
        { content: "", styles: { fillColor: [107, 139, 155] as [number,number,number] } },
        { content: "Group Monitoring", colSpan: monitoringSpan, styles: { fillColor: [107, 139, 155] as [number,number,number], textColor: 255, halign: "center" as const } },
      ],
      colHeaderRow.map((label, i) => ({
        content: label,
        styles: {
          fillColor: [107, 139, 155] as [number,number,number],
          textColor: 255 as number,
          fontStyle: "bold" as const,
          fontSize: 7,
        },
      })),
    ];

    autoTable(doc, {
      head,
      body: dataRows,
      startY: 26,
      styles: { fontSize: 7, cellPadding: 2, overflow: "linebreak" },
      headStyles: { fillColor: [107, 139, 155], textColor: 255 },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: {
        0: { fontStyle: "bold", fillColor: [251, 228, 219], cellWidth: 18 },
        1: { cellWidth: 22 },
        [supportStartCol + supportSpan]: { cellWidth: 4, fillColor: [107, 139, 155] },
      },
      didParseCell: (hookData) => {
        // Highlight day column
        if (hookData.column.index === 0 && hookData.section === "body") {
          hookData.cell.styles.fillColor = [251, 228, 219];
          hookData.cell.styles.fontStyle = "bold";
        }
      },
    });

    doc.save("team-duty-schedule.pdf");
  };

  const exportImage = async () => {
    const { default: html2canvas } = await import("html2canvas");
    const table = document.querySelector("[data-schedule-table]") as HTMLElement;
    if (!table) return;

    const canvas = await html2canvas(table, {
      scale: 2,
      backgroundColor: "#ffffff",
      useCORS: true,
    });

    const link = document.createElement("a");
    link.download = "team-duty-schedule.png";
    link.href = canvas.toDataURL("image/png");
    link.click();
  };

  // Get all unique members assigned to schedule
  const getAssignedMembers = useCallback(() => {
    const uniqueMemberIds = new Set<string>();
    if (data) {
      for (const assignment of data.assignments) {
        if (assignment.memberId) {
          uniqueMemberIds.add(assignment.memberId);
        }
      }
    }
    return Array.from(uniqueMemberIds)
      .map((id) => members.find((m) => m.id === id))
      .filter((m) => m !== undefined);
  }, [data, members]);

  // Broadcast schedule to assigned members
  const handleBroadcast = async (formats: string[]) => {
    if (!data) return;

    setIsBroadcasting(true);
    try {
      const assignedMembers = getAssignedMembers();
      const memberEmails = assignedMembers
        .map((m) => m?.user.email)
        .filter((e) => e) as string[];

      if (memberEmails.length === 0) {
        throw new Error("No members assigned to the schedule");
      }

      // Call backend API using apiClient
      await apiClient.broadcastSchedule(
        memberEmails,
        formats,
        data.template?.name || "Weekly Duty Schedule"
      );

      setShowBroadcastModal(false);
      alert(`Schedule sent to ${memberEmails.length} member${memberEmails.length !== 1 ? "s" : ""}!`);
    } catch (err: any) {
      throw new Error(err?.message || "Failed to broadcast schedule");
    } finally {
      setIsBroadcasting(false);
    }
  };

  // ── Render ───────────────────────────────────────────────────────────────

  if (isLoading) return <div className="p-4 text-sm text-gray-500">Loading schedule…</div>;
  if (error) return <div className="p-4 text-sm text-red-600">Failed to load schedule.</div>;
  if (!data) return <div className="p-4 text-sm text-gray-500">No schedule data found.</div>;

  return (
    <div className="rounded-xl border border-slate-300 bg-white shadow-sm">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3">
        <div>
          <h2 className="text-base font-semibold text-slate-900">Weekly Duty Template</h2>
          <p className="text-xs text-slate-500">Saturday to Friday · all active batches</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Export dropdown */}
          <ExportMenu onExcelExport={exportExcel} onPdfExport={exportPDF} onImageExport={exportImage} />

          {/* Broadcast button */}
          <button
            type="button"
            onClick={() => setShowBroadcastModal(true)}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Mail size={14} />
            Broadcast
          </button>

          <button
            type="button"
            onClick={toggleEditMode}
            className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            {isEditing ? "View Mode" : "Edit Mode"}
          </button>
          {isEditing && (
            <>
              <button
                type="button"
                onClick={resetDraft}
                disabled={!hasUnsavedChanges}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
              >
                Reset
              </button>
              <button
                type="button"
                onClick={saveTemplate}
                disabled={saving}
                className="rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Error banner ── */}
      {saveError && (
        <div className="border-b border-red-200 bg-red-50 px-4 py-2 text-xs text-red-700">{saveError}</div>
      )}

      {/* ── Table ── */}
      <div className="overflow-x-auto bg-slate-50 p-3">
        <table className="w-full border-collapse text-xs" style={{ tableLayout: "fixed" }} data-schedule-table>
          {/* colgroup is the ONLY reliable way to set widths with table-layout:fixed + colspans */}
          <colgroup>
            <col style={{ width: getWidth("__day__") }} />
            <col style={{ width: getWidth("__batch__") }} />
            {supportColumns.map((col) => (
              <col key={buildColumnKey(col)} style={{ width: getWidth(buildColumnKey(col)) }} />
            ))}
            <col style={{ width: 16 }} />
            {monitoringColumns.map((col) => (
              <col key={buildColumnKey(col)} style={{ width: getWidth(buildColumnKey(col)) }} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th colSpan={2} className="border-2 border-black bg-[#6B8B9B] px-2 py-2 text-white" />
              <th
                colSpan={supportColumns.length}
                className="border-2 border-black bg-[#6B8B9B] px-2 py-2 text-xs font-bold text-white"
              >
                Support Session
              </th>
              <th className="border-2 border-black bg-[#6B8B9B] px-1 py-2" />
              <th
                colSpan={monitoringColumns.length}
                className="border-2 border-black bg-[#6B8B9B] px-2 py-2 text-xs font-bold text-white"
              >
                Group Monitoring
              </th>
            </tr>
            <tr>
              <ResizableHeader label="Day" colKey="__day__" onMouseDown={onMouseDown} />
              <ResizableHeader label="Batch" colKey="__batch__" onMouseDown={onMouseDown} />
              {supportColumns.map((col) => (
                <ResizableHeader
                  key={buildColumnKey(col)}
                  label={col.slotLabel}
                  colKey={buildColumnKey(col)}
                  onMouseDown={onMouseDown}
                />
              ))}
              <th className="border-2 border-black bg-[#6B8B9B] px-1 py-1" />
              {monitoringColumns.map((col) => (
                <ResizableHeader
                  key={buildColumnKey(col)}
                  label={col.slotLabel}
                  colKey={buildColumnKey(col)}
                  onMouseDown={onMouseDown}
                />
              ))}
            </tr>
          </thead>
          <tbody>
            {DAY_ROWS.map(({ dayOfWeek, label: dayLabel }) =>
              data.batches.map((batch, rowIndex) => {
                const isLastRow = rowIndex === data.batches.length - 1;
                const rowBorderClass = isLastRow ? "border-b-[3px] border-black" : "";
                const cellBorderClass = isLastRow
                  ? "border-b-2 border-black"
                  : "border-b-2 border-dotted border-b-slate-500";

                return (
                  <tr key={`${dayLabel}-${batch.id}`} className={rowBorderClass}>
                    {/* Day cell (rowspan) */}
                    {rowIndex === 0 && (
                      <td
                        rowSpan={data.batches.length}
                        className="border-2 border-black bg-[#FBE4DB] px-2 py-1 text-xs font-semibold text-slate-900"
                      >
                        {dayLabel}
                      </td>
                    )}

                    {/* Batch cell */}
                    <td className={`border-x-2 border-black px-2 py-1 font-medium text-slate-900 ${cellBorderClass}`}>
                      <span className={`inline-block rounded-full px-2 py-0.5 text-xs ${batchPillClass(batch.name)}`}>
                        {batch.name}
                      </span>
                    </td>

                    {/* Support Session cells */}
                    {supportColumns.map((col) => {
                      const colKey = buildColumnKey(col);
                      const cellKey = buildCellKey(dayOfWeek, batch.id, colKey);
                      const slot = getCellSlot(dayOfWeek, batch.id, col);
                      const memberIds = getCellMemberIds(cellKey, slot);

                      return (
                        <EditableMemberCell
                          key={cellKey}
                          selectedIds={memberIds}
                          members={members}
                          isEditing={isEditing}
                          onChange={(ids) => handleCellChange(cellKey, ids)}
                          className={cellBorderClass}
                        />
                      );
                    })}

                    {/* Separator */}
                    <td className="border-2 border-black bg-[#6B8B9B] px-2 py-1" />

                    {/* Group Monitoring cells - ONLY show for first batch in day */}
                    {rowIndex === 0 ? (
                      <>
                        {monitoringColumns.map((col) => {
                          const colKey = buildColumnKey(col);
                          const cellKey = buildCellKey(dayOfWeek, batch.id, colKey);
                          const slot = getCellSlot(dayOfWeek, batch.id, col);
                          const memberIds = getCellMemberIds(cellKey, slot);

                          return (
                            <EditableMemberCell
                              key={cellKey}
                              selectedIds={memberIds}
                              members={members}
                              isEditing={isEditing}
                              onChange={(ids) => handleCellChange(cellKey, ids)}
                              className={cellBorderClass}
                            />
                          );
                        })}
                      </>
                    ) : (
                      <>
                        {monitoringColumns.map((col) => (
                          <td key={`${dayOfWeek}-${batch.id}-${buildColumnKey(col)}-empty`} className={`border-2 border-black ${cellBorderClass}`} />
                        ))}
                      </>
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ── Footer ── */}
      <div className="border-t border-slate-200 px-4 py-2 text-xs text-slate-500">
        {isEditing ? (
          <>Click any cell to assign or remove team members.</>
        ) : (
          <>View mode · switch to Edit Mode to make changes.</>
        )}
        {hasUnsavedChanges && (
          <span className="ml-2 rounded bg-amber-100 px-1.5 py-0.5 text-amber-700 font-medium">
            Unsaved changes
          </span>
        )}
      </div>

      {/* ── Broadcast Modal ── */}
      <BroadcastScheduleModal
        isOpen={showBroadcastModal}
        memberCount={getAssignedMembers().length}
        isLoading={isBroadcasting}
        onBroadcast={handleBroadcast}
        onCancel={() => setShowBroadcastModal(false)}
      />
    </div>
  );
}
