"use client";
import { useMemo, useState } from "react";
import { ChartContainer } from "./ChartContainer";
import { ChartDataTable } from "./ChartDataTable";
import type { CallLog } from "@/types/call-lists.types";

interface CallDensityHeatmapProps {
  callLogs: CallLog[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
}

interface HeatmapData {
  assignee: string;
  monday: number;
  tuesday: number;
  wednesday: number;
  thursday: number;
  friday: number;
  saturday: number;
  sunday: number;
}

const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function CallDensityHeatmap({ callLogs, isLoading, error, onRetry }: CallDensityHeatmapProps) {
  const [tableVisible, setTableVisible] = useState(false);

  const { heatmapData, isEmpty } = useMemo(() => {
    if (!callLogs || callLogs.length === 0) return { heatmapData: [], isEmpty: true };
    const grouped: Record<string, Record<number, number>> = {};
    callLogs.forEach((log) => {
      const assigneeName = log.assignee?.user?.name || "Unknown";
      const dayOfWeek = new Date(log.callDate).getDay();
      if (!grouped[assigneeName]) grouped[assigneeName] = { 0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      grouped[assigneeName][dayOfWeek]++;
    });
    const data: HeatmapData[] = Object.entries(grouped).map(([assignee, days]) => ({ assignee, monday: days[1], tuesday: days[2], wednesday: days[3], thursday: days[4], friday: days[5], saturday: days[6], sunday: days[0] })).sort((a, b) => {
      const aTotal = Object.values(a).reduce((sum: number, val) => sum + (typeof val === 'number' ? val : 0), 0);
      const bTotal = Object.values(b).reduce((sum: number, val) => sum + (typeof val === 'number' ? val : 0), 0);
      return bTotal - aTotal;
    }).slice(0, 10);
    return { heatmapData: data, isEmpty: data.length === 0 };
  }, [callLogs]);

  const maxCalls = useMemo(() => {
    let max = 0;
    heatmapData.forEach((row) => {
      dayNames.forEach((day) => {
        const val = row[day as keyof HeatmapData];
        if (typeof val === 'number') max = Math.max(max, val);
      });
    });
    return max || 1;
  }, [heatmapData]);

  const getColor = (value: number) => {
    if (value === 0) return "bg-[var(--groups1-surface)]";
    const intensity = value / maxCalls;
    if (intensity > 0.75) return "bg-green-700";
    if (intensity > 0.5) return "bg-green-500";
    if (intensity > 0.25) return "bg-green-300";
    return "bg-green-100";
  };

  const tableData = useMemo(() => heatmapData.map((row) => ({ assignee: row.assignee, monday: row.monday, tuesday: row.tuesday, wednesday: row.wednesday, thursday: row.thursday, friday: row.friday, saturday: row.saturday, sunday: row.sunday, total: row.monday + row.tuesday + row.wednesday + row.thursday + row.friday + row.saturday + row.sunday })), [heatmapData]);
  const tableColumns = [
    { key: "assignee", label: "Assignee", sortable: true },
    { key: "monday", label: "Mon", sortable: true, format: (v: number) => v.toString() },
    { key: "tuesday", label: "Tue", sortable: true, format: (v: number) => v.toString() },
    { key: "wednesday", label: "Wed", sortable: true, format: (v: number) => v.toString() },
    { key: "thursday", label: "Thu", sortable: true, format: (v: number) => v.toString() },
    { key: "friday", label: "Fri", sortable: true, format: (v: number) => v.toString() },
    { key: "saturday", label: "Sat", sortable: true, format: (v: number) => v.toString() },
    { key: "sunday", label: "Sun", sortable: true, format: (v: number) => v.toString() },
    { key: "total", label: "Total", sortable: true, format: (v: number) => v.toString() },
  ];

  return (
    <ChartContainer title="Call Density Heatmap (Top 10 Assignees)" isLoading={isLoading} isEmpty={isEmpty} error={error} onRetry={onRetry} height="h-[300px]" showTableToggle tableVisible={tableVisible} onTableToggle={() => setTableVisible(!tableVisible)}>
      {tableVisible ? (
        <ChartDataTable columns={tableColumns} data={tableData} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr>
                <th className="px-3 py-2 text-left font-semibold bg-[var(--groups1-secondary)] text-[var(--groups1-text)]">Assignee</th>
                {dayLabels.map((day) => (
                  <th key={day} className="px-2 py-2 text-center font-semibold bg-[var(--groups1-secondary)] text-[var(--groups1-text)]">{day}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {heatmapData.map((row) => (
                <tr key={row.assignee} className="border-b border-[var(--groups1-border)]">
                  <td className="px-3 py-2 font-medium text-[var(--groups1-text)]">{row.assignee}</td>
                  {dayNames.map((day) => {
                    const value = row[day as keyof HeatmapData];
                    return <td key={`${row.assignee}-${day}`} className={`px-2 py-2 text-center font-semibold ${getColor(value as number)} text-xs`}>{value}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ChartContainer>
  );
}
