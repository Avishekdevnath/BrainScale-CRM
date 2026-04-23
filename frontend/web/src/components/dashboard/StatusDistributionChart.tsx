"use client";
import { useMemo, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { ChartContainer } from "./ChartContainer";
import { ChartDataTable } from "./ChartDataTable";
import type { StatusDistributionItem } from "@/types/dashboard.types";

interface StatusDistributionChartProps {
  data: StatusDistributionItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
}

const statusColors: Record<string, string> = {
  NEW: "#3b82f6", IN_PROGRESS: "#eab308", FOLLOW_UP: "#a855f7", CONVERTED: "#22c55e", LOST: "#ef4444",
};

export function StatusDistributionChart({ data, isLoading, error, onRetry }: StatusDistributionChartProps) {
  const [tableVisible, setTableVisible] = useState(false);
  const isEmpty = useMemo(() => !data || data.length === 0, [data]);
  const totalCount = useMemo(() => (Array.isArray(data) ? data : []).reduce((sum, item) => sum + item.count, 0), [data]);
  const tableData = useMemo(() => (Array.isArray(data) ? data : []).map((item) => ({ status: item.status, count: item.count, percentage: ((item.count / totalCount) * 100).toFixed(1) })), [data, totalCount]);
  const tableColumns = [
    { key: "status", label: "Status", sortable: true },
    { key: "count", label: "Count", sortable: true, format: (value: number) => value.toLocaleString() },
    { key: "percentage", label: "Percentage", sortable: true, format: (value: string) => `${value}%` },
  ];

  return (
    <ChartContainer title="Status Distribution" isLoading={isLoading} isEmpty={isEmpty} error={error} onRetry={onRetry} height="h-[250px]" showTableToggle tableVisible={tableVisible} onTableToggle={() => setTableVisible(!tableVisible)}>
      {tableVisible ? (
        <ChartDataTable columns={tableColumns} data={tableData} />
      ) : (
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={data || []} layout="vertical" margin={{ top: 5, right: 30, left: 100, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--groups1-border)" />
            <XAxis type="number" stroke="var(--groups1-text-secondary)" style={{ fontSize: "12px" }} />
            <YAxis dataKey="status" type="category" stroke="var(--groups1-text-secondary)" style={{ fontSize: "12px" }} />
            <Tooltip contentStyle={{ backgroundColor: "var(--groups1-surface)", border: "1px solid var(--groups1-border)", color: "var(--groups1-text)" }} formatter={(value: number) => `${value} calls`} />
            <Bar dataKey="count" fill="var(--groups1-primary)" radius={[0, 8, 8, 0]}>
              {(Array.isArray(data) ? data : []).map((entry) => (
                <Cell key={`cell-${entry.status}`} fill={statusColors[entry.status] || "#gray"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}
