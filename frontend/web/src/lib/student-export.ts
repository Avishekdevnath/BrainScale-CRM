import Papa from "papaparse";
import * as XLSX from "xlsx";
import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";

export type StudentExportFormat = "csv" | "xlsx" | "pdf";

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

function sanitizeRows(rows: Record<string, string>[]) {
  return rows.filter((row) => Object.keys(row).some((key) => key && row[key]));
}

export async function saveStudentExportFromCSV(
  format: StudentExportFormat,
  csvBlob: Blob,
  columns: string[],
  filenameBase: string
) {
  if (format === "csv") {
    downloadBlob(csvBlob, `${filenameBase}.csv`);
    return;
  }

  const csvText = await csvBlob.text();
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  });

  const rows = sanitizeRows(((parsed as { data: Record<string, string>[] }).data) ?? []);
  const orderedRows = rows.map((row) =>
    columns.map((column) => (row[column] ?? "").toString())
  );

  if (format === "xlsx") {
    const worksheet = XLSX.utils.aoa_to_sheet([columns, ...orderedRows]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Students");
    const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const blob = new Blob([arrayBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    downloadBlob(blob, `${filenameBase}.xlsx`);
    return;
  }

  const doc = new jsPDF(columns.length > 4 ? "landscape" : "portrait");
  doc.setFontSize(14);
  doc.text("Students Export", 14, 18);

  autoTable(doc, {
    head: [columns],
    body: orderedRows,
    startY: 24,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [44, 82, 130], halign: "left" },
    bodyStyles: { halign: "left" },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filenameBase}.pdf`);
}

