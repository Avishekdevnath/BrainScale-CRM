"use client";
import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer } from "./ChartContainer";
import { ChartDataTable } from "./ChartDataTable";
import type { FollowupsTrendItem } from "@/types/dashboard.types";

interface FollowupsTrendChartProps {
  data: FollowupsTrendItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
}

export function FollowupsTrendChart({ data, isLoading, error, onRetry }: FollowupsTrendChartProps) {
  const [tableVisible, setTableVisible] = useState(false);
  const isEmpty = useMemo(() => !data || data.length === 0, [data]);
  const tableData = useMemo(() => (Array.isArray(data) ? data : []).map((item) => ({ date: item.date, pending: item.pending, overdue: item.overdue, total: item.pending + item.overdue })), [data]);
  const tableColumns = [
    { key: "date", label: "Date", sortable: true },
    { key: "pending", label: "Pending", sortable: true, format: (value: number) => value.toLocaleString() },
    { key: "overdue", label: "Overdue", sortable: true, format: (value: number) => value.toLocaleString() },
    { key: "total", label: "Total", sortable: true, format: (value: number) => value.toLocaleString() },
  ];

  return (
    <ChartContainer title="Follow-ups Over Time" isLoading={isLoading} isEmpty={isEmpty} error={error} onRetry={onRetry} height="h-[300px]" showTableToggle tableVisible={tableVisible} onTableToggle={() => setTableVisible(!tableVisible)}>
      {tableVisible ? (
        <ChartDataTable columns={tableColumns} data={tableData} />
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data || []}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--groups1-border)" />
            <XAxis dataKey="date" stroke="var(--groups1-text-secondary)" style={{ fontSize: "12px" }} />
            <YAxis stroke="var(--groups1-text-secondary)" style={{ fontSize: "12px" }} />
            <Tooltip contentStyle={{ backgroundColor: "var(--groups1-surface)", border: "1px solid var(--groups1-border)", color: "var(--groups1-text)" }} />
            <Legend />
            <Line type="monotone" dataKey="pending" stroke="#3b82f6" name="Pending" strokeWidth={2} dot={{ fill: "#3b82f6", r: 4 }} activeDot={{ r: 6 }} />
            <Line type="monotone" dataKey="overdue" stroke="#ef4444" name="Overdue" strokeWidth={2} dot={{ fill: "#ef4444", r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}
