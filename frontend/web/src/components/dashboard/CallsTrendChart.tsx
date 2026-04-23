"use client";
import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { ChartContainer } from "./ChartContainer";
import { ChartDataTable } from "./ChartDataTable";
import type { CallsTrendItem } from "@/types/dashboard.types";

interface CallsTrendChartProps {
  data: CallsTrendItem[] | undefined;
  isLoading: boolean;
  error: Error | null;
  onRetry?: () => void;
}

export function CallsTrendChart({ data, isLoading, error, onRetry }: CallsTrendChartProps) {
  const [tableVisible, setTableVisible] = useState(false);
  const isEmpty = useMemo(() => !data || data.length === 0, [data]);
  const tableData = useMemo(() => (Array.isArray(data) ? data : []).map((item) => ({ date: item.date, count: item.count })), [data]);
  const tableColumns = [
    { key: "date", label: "Date", sortable: true },
    { key: "count", label: "Calls", sortable: true, format: (value: number) => value.toLocaleString() },
  ];

  return (
    <ChartContainer
      title="Calls Over Time"
      isLoading={isLoading}
      isEmpty={isEmpty}
      error={error}
      onRetry={onRetry}
      height="h-[300px]"
      showTableToggle
      tableVisible={tableVisible}
      onTableToggle={() => setTableVisible(!tableVisible)}
    >
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
            <Line type="monotone" dataKey="count" stroke="var(--groups1-primary)" name="Calls" strokeWidth={2} dot={{ fill: "var(--groups1-primary)", r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </ChartContainer>
  );
}
