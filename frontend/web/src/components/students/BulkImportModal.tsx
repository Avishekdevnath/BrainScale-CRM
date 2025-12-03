"use client";

import { ChangeEvent, DragEvent, useState, useMemo, useCallback, useEffect, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { apiClient } from "@/lib/api-client";
import { useGroups } from "@/hooks/useGroups";
import { BatchSelector } from "@/components/batches/BatchSelector";
import { toast } from "sonner";
import { Loader2, AlertCircle, CheckCircle2, Plus, X, Download, Upload } from "lucide-react";
import { cn } from "@/lib/utils";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import type {
  BulkPasteRequest,
  BulkPasteResponse,
  BulkPasteMappingFlexible,
  StudentsListParams,
} from "@/types/students.types";

type EnrollmentStatus = NonNullable<StudentsListParams["status"]>;

const enrollmentStatusOptions: EnrollmentStatus[] = [
  "NEW",
  "IN_PROGRESS",
  "FOLLOW_UP",
  "CONVERTED",
  "LOST",
];

function translateImportError(message: string): string {
  const lowerMessage = message.toLowerCase();

  if (lowerMessage.includes("name is required")) {
    return "Missing name – please add a name for this student";
  }
  if (lowerMessage.includes("email") && lowerMessage.includes("invalid")) {
    return "Invalid email format – please review the email address";
  }
  if (lowerMessage.includes("email") && (lowerMessage.includes("duplicate") || lowerMessage.includes("already exists"))) {
    return "Email already exists – this student might already be in the system";
  }
  if (lowerMessage.includes("discord")) {
    return "Discord ID could not be processed – please check the value";
  }
  if (lowerMessage.includes("enrollment") && lowerMessage.includes("failed")) {
    return "Could not enroll student in the group – check group access permissions";
  }

  return message;
}

function translateApiError(error: unknown): string {
  if (!(error instanceof Error)) {
    return "Failed to import students. Please try again.";
  }

  const message = error.message.toLowerCase();

  if (message.includes("network") || message.includes("fetch") || message.includes("connection")) {
    return "Network error. Please check your connection and try again.";
  }
  if (message.includes("unauthorized") || message.includes("401")) {
    return "Your session has expired. Please refresh the page and try again.";
  }
  if (message.includes("forbidden") || message.includes("403") || message.includes("access denied")) {
    return "You don't have permission to import students. Please contact your administrator.";
  }
  if (message.includes("validation") || message.includes("invalid")) {
    if (message.includes("2000")) {
      return "Too many rows. Maximum 2000 rows allowed per import.";
    }
    if (message.includes("name")) {
      return "Name is required for all students. Please check your CSV data.";
    }
    return "Invalid data format. Please check your CSV and try again.";
  }
  if (message.includes("not found")) {
    if (message.includes("group")) {
      return "The selected group was not found. Please select a different group.";
    }
    return "Resource not found. Please refresh and try again.";
  }
  if (message.includes("rate limit") || message.includes("too many requests")) {
    return "Too many requests. Please wait a moment and try again.";
  }
  if (message.includes("server error") || message.includes("internal error") || message.includes("500")) {
    return "Server error. Please try again in a moment.";
  }

  if (error.message.length < 100 && !error.message.includes("api") && !error.message.includes("endpoint")) {
    return error.message;
  }

  return "Failed to import students. Please check your data and try again.";
}

interface BulkImportModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  groupId?: string; // Optional: pre-filled group ID for group-level imports
  onSuccess?: () => void; // Callback after successful import
}

type MappingMode = "simple" | "advanced";
type PhoneKey = `phone.${string}`;

export function BulkImportModal({ open, onOpenChange, groupId, onSuccess }: BulkImportModalProps) {
  const [csvText, setCsvText] = useState("");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkPasteResponse | null>(null);
  const [mappingMode, setMappingMode] = useState<MappingMode>("simple");
  const [inputMode, setInputMode] = useState<"paste" | "upload">("paste");
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Simple mapping (old format)
  const [simpleMapping, setSimpleMapping] = useState<{
    name: string;
    email?: string;
    discordId?: string;
    phone?: string;
    tags?: string;
  }>({
    name: "",
    email: "",
    discordId: "",
    phone: "",
    tags: "",
  });

  // Advanced mapping (new flexible format)
  const [flexibleMapping, setFlexibleMapping] = useState<{
    "student.name": string;
    "student.email"?: string;
    "student.discordId"?: string;
    "student.tags"?: string;
    phones: Array<{ key: PhoneKey; column: string }>; // e.g., [{key: "phone.0", column: "Primary Phone"}]
    "enrollment.groupName"?: string;
    "enrollment.courseName"?: string;
    "enrollment.status"?: string;
  }>({
    "student.name": "",
    "student.email": "",
    "student.discordId": "",
    "student.tags": "",
    phones: [],
    "enrollment.groupName": "",
    "enrollment.courseName": "",
    "enrollment.status": "",
  });

  const [selectedGroupId, setSelectedGroupId] = useState<string>(groupId || "");
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [defaultStatus, setDefaultStatus] = useState<EnrollmentStatus | "">("");

  const { data: groups } = useGroups();

  const handleFileUpload = useCallback(
    async (file: File) => {
      try {
        const lower = file.name.toLowerCase();
        let nextText = "";
        if (lower.endsWith(".csv")) {
          nextText = await file.text();
        } else if (lower.endsWith(".xlsx") || lower.endsWith(".xls")) {
          const buffer = await file.arrayBuffer();
          const workbook = XLSX.read(buffer, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          if (!sheetName) {
            throw new Error("No sheets found in the uploaded file.");
          }
          const sheet = workbook.Sheets[sheetName];
          nextText = XLSX.utils.sheet_to_csv(sheet);
        } else {
          throw new Error("Unsupported file type");
        }
        setCsvText(nextText);
        setUploadedFileName(file.name);
        setInputMode("upload");
        toast.success("File parsed. Review the preview before importing.");
      } catch (error) {
        console.error(error);
        toast.error("Failed to read the selected file. Please upload a CSV or Excel file.");
      }
    },
    []
  );

  const handleFileInputChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file) {
        void handleFileUpload(file);
      }
      event.target.value = "";
    },
    [handleFileUpload]
  );

  const handleFileDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      if (isImporting) return;
      const file = event.dataTransfer.files?.[0];
      if (file) {
        void handleFileUpload(file);
      }
    },
    [handleFileUpload, isImporting]
  );

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  }, []);

  const clearUploadedFile = useCallback(() => {
    setUploadedFileName(null);
    setCsvText("");
  }, []);

  const handleDownloadErrors = useCallback(() => {
    if (!importResult?.errors?.length) {
      return;
    }
    const rows = [
      ["Row", "Message"],
      ...importResult.errors.map((error) => [String(error.rowIndex + 1), error.message]),
    ];
    const csvContent = rows
      .map((row) => row.map((cell) => `"${`${cell ?? ""}`.replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `student-import-errors-${Date.now()}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }, [importResult]);

  // Sync selectedGroupId when groupId prop changes
  useEffect(() => {
    if (groupId) {
      setSelectedGroupId(groupId);
    } else {
      // Reset if groupId prop is removed
      setSelectedGroupId("");
    }
  }, [groupId]);

  // Parse CSV and extract headers
  const parsedData = useMemo(() => {
    if (!csvText.trim()) return null;
    try {
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header: string) => header.trim(),
      });
      return result;
    } catch (error) {
      return null;
    }
  }, [csvText]);

  const headers = useMemo(() => {
    if (!parsedData || parsedData.errors.length > 0 || !parsedData.data || parsedData.data.length === 0) {
      return [];
    }
    return Object.keys(parsedData.data[0] as Record<string, unknown>);
  }, [parsedData]);

  const rowCount = useMemo(() => {
    if (!parsedData || !parsedData.data) return 0;
    return parsedData.data.length;
  }, [parsedData]);

  const isGroupColumnMapped = mappingMode === "advanced" && Boolean(flexibleMapping["enrollment.groupName"]);
  const isGroupSelectionRequired = !isGroupColumnMapped;
  const isGroupSelectionMissing = isGroupSelectionRequired && !selectedGroupId;

  // Validation: Check for potential issues
  const validationIssues = useMemo(() => {
    if (!parsedData || !parsedData.data || parsedData.data.length === 0) return [];
    
    const issues: Array<{ rowIndex: number; message: string }> = [];
    const nameColumn = mappingMode === "simple" 
      ? simpleMapping.name 
      : flexibleMapping["student.name"];
    
    if (!nameColumn) return issues; // Can't validate without name column
    
    parsedData.data.forEach((row: Record<string, unknown>, index: number) => {
      const rowData = row as Record<string, unknown>;
      const nameValue = String(rowData[nameColumn] ?? "").trim();
      
      if (!nameValue) {
        issues.push({
          rowIndex: index + 1, // 1-based for user display
          message: "Missing name",
        });
      }
      
      // Check email format if email column is mapped
      const emailColumn = mappingMode === "simple"
        ? simpleMapping.email
        : flexibleMapping["student.email"];
      
      if (emailColumn) {
        const emailValue = String(rowData[emailColumn] ?? "").trim();
        if (emailValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) {
          issues.push({
            rowIndex: index + 1,
            message: "Invalid email format",
          });
        }
      }
    });
    
    return issues;
  }, [parsedData, mappingMode, simpleMapping, flexibleMapping]);

  // Estimated import time (rough estimate: ~100ms per row)
  const estimatedTime = useMemo(() => {
    if (rowCount === 0) return null;
    const seconds = Math.ceil(rowCount * 0.1);
    if (seconds < 60) return `${seconds} second${seconds !== 1 ? "s" : ""}`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes} minute${minutes !== 1 ? "s" : ""}${remainingSeconds > 0 ? ` ${remainingSeconds} second${remainingSeconds !== 1 ? "s" : ""}` : ""}`;
  }, [rowCount]);

  // Preview rows (first 5)
  const previewRows = useMemo(() => {
    if (!parsedData || !parsedData.data || parsedData.data.length === 0) return [];
    return parsedData.data.slice(0, 5) as Array<Record<string, unknown>>;
  }, [parsedData]);

  // Auto-resize textarea based on content
  useEffect(() => {
    if (textareaRef.current) {
      // Reset height to auto to get the correct scrollHeight
      textareaRef.current.style.height = "auto";
      // Set height based on content, with min and max constraints
      const scrollHeight = textareaRef.current.scrollHeight;
      const minHeight = 200; // min-h-[200px]
      const maxHeight = 500; // max-h-[500px] - will scroll after this
      const newHeight = Math.max(minHeight, Math.min(scrollHeight, maxHeight));
      textareaRef.current.style.height = `${newHeight}px`;
    }
  }, [csvText]);

  // Auto-detect mapping when headers change
  useEffect(() => {
    if (headers.length > 0) {
      // Auto-detect for simple mode
      if (mappingMode === "simple" && !simpleMapping.name) {
        const nameHeader = headers.find(
          (h) =>
            h.toLowerCase().includes("name") ||
            h.toLowerCase().includes("full name") ||
            h.toLowerCase() === "name"
        );
        if (nameHeader) {
          setSimpleMapping((prev) => ({ ...prev, name: nameHeader }));
        }

        const emailHeader = headers.find((h) => h.toLowerCase().includes("email"));
        if (emailHeader) {
          setSimpleMapping((prev) => ({ ...prev, email: emailHeader }));
        }

        const discordHeader = headers.find((h) => h.toLowerCase().includes("discord"));
        if (discordHeader) {
          setSimpleMapping((prev) => ({ ...prev, discordId: discordHeader }));
        }

        const phoneHeader = headers.find(
          (h) => h.toLowerCase().includes("phone") || h.toLowerCase().includes("mobile")
        );
        if (phoneHeader) {
          setSimpleMapping((prev) => ({ ...prev, phone: phoneHeader }));
        }

        const tagsHeader = headers.find((h) => h.toLowerCase().includes("tag"));
        if (tagsHeader) {
          setSimpleMapping((prev) => ({ ...prev, tags: tagsHeader }));
        }
      }

      // Auto-detect for advanced mode
      if (mappingMode === "advanced" && !flexibleMapping["student.name"]) {
        const nameHeader = headers.find(
          (h) =>
            h.toLowerCase().includes("name") ||
            h.toLowerCase().includes("full name") ||
            h.toLowerCase() === "name"
        );
        if (nameHeader) {
          setFlexibleMapping((prev) => ({ ...prev, "student.name": nameHeader }));
        }

        const emailHeader = headers.find((h) => h.toLowerCase().includes("email"));
        if (emailHeader) {
          setFlexibleMapping((prev) => ({ ...prev, "student.email": emailHeader }));
        }

        const discordHeader = headers.find((h) => h.toLowerCase().includes("discord"));
        if (discordHeader) {
          setFlexibleMapping((prev) => ({ ...prev, "student.discordId": discordHeader }));
        }

        const tagsHeader = headers.find((h) => h.toLowerCase().includes("tag"));
        if (tagsHeader) {
          setFlexibleMapping((prev) => ({ ...prev, "student.tags": tagsHeader }));
        }

        // Auto-detect phones
        const phoneHeaders = headers.filter(
          (h) => h.toLowerCase().includes("phone") || h.toLowerCase().includes("mobile")
        );
        if (phoneHeaders.length > 0) {
          const newPhones = phoneHeaders.map((header, idx) => ({
            key: `phone.${idx}` as PhoneKey,
            column: header,
          }));
          setFlexibleMapping((prev) => ({ ...prev, phones: newPhones }));
        }

        // Auto-detect enrollment fields
        const groupHeader = headers.find((h) => h.toLowerCase().includes("group"));
        if (groupHeader) {
          setFlexibleMapping((prev) => ({ ...prev, "enrollment.groupName": groupHeader }));
        }

        const courseHeader = headers.find((h) => h.toLowerCase().includes("course"));
        if (courseHeader) {
          setFlexibleMapping((prev) => ({ ...prev, "enrollment.courseName": courseHeader }));
        }

        const statusHeader = headers.find((h) => h.toLowerCase().includes("status"));
        if (statusHeader) {
          setFlexibleMapping((prev) => ({ ...prev, "enrollment.status": statusHeader }));
        }
      }
    }
  }, [headers, mappingMode, simpleMapping.name, flexibleMapping["student.name"]]);

  const handleImport = useCallback(async () => {
    if (!parsedData || !parsedData.data || parsedData.data.length === 0) {
      toast.error("Please paste CSV data");
      return;
    }

    // Validate required fields based on mode
    if (mappingMode === "simple" && !simpleMapping.name) {
      toast.error("Please select a column for Name (required)");
      return;
    }

    if (mappingMode === "advanced" && !flexibleMapping["student.name"]) {
      toast.error("Please select a column for Student Name (required)");
      return;
    }

    const resolvedGroupId = selectedGroupId || groupId || "";
    const hasGroupMapping = mappingMode === "advanced" && Boolean(flexibleMapping["enrollment.groupName"]);
    if (!hasGroupMapping && !resolvedGroupId) {
      toast.error("Select a group or map a group column to enroll students.");
      return;
    }

    setIsImporting(true);
    setImportResult(null);

    try {
      // Convert parsed data to rows format
      const rows = parsedData.data.map((row: Record<string, unknown>) => {
        const record: Record<string, string> = {};
        Object.keys(row as Record<string, unknown>).forEach((key) => {
          const value = (row as Record<string, unknown>)[key];
          record[key] = String(value ?? "").trim();
        });
        return record;
      });

      // Build mapping based on mode
      let mapping: BulkPasteRequest["mapping"];
      if (mappingMode === "simple") {
        // Old format
        mapping = {
          name: simpleMapping.name,
          email: simpleMapping.email || undefined,
          discordId: simpleMapping.discordId || undefined,
          phone: simpleMapping.phone || undefined,
          tags: simpleMapping.tags || undefined,
        };
      } else {
        // New flexible format
        const flexibleMap: BulkPasteMappingFlexible = {
          "student.name": flexibleMapping["student.name"],
        };
        if (flexibleMapping["student.email"]) {
          flexibleMap["student.email"] = flexibleMapping["student.email"];
        }
        if (flexibleMapping["student.discordId"]) {
          flexibleMap["student.discordId"] = flexibleMapping["student.discordId"];
        }
        if (flexibleMapping["student.tags"]) {
          flexibleMap["student.tags"] = flexibleMapping["student.tags"];
        }
        flexibleMapping.phones.forEach((phone) => {
          flexibleMap[phone.key] = phone.column;
        });
        if (flexibleMapping["enrollment.groupName"]) {
          flexibleMap["enrollment.groupName"] = flexibleMapping["enrollment.groupName"];
        }
        if (flexibleMapping["enrollment.courseName"]) {
          flexibleMap["enrollment.courseName"] = flexibleMapping["enrollment.courseName"];
        }
        if (flexibleMapping["enrollment.status"]) {
          flexibleMap["enrollment.status"] = flexibleMapping["enrollment.status"];
        }
        mapping = flexibleMap as BulkPasteRequest["mapping"];
      }

      const request: BulkPasteRequest = {
        rows,
        mapping,
        groupId: resolvedGroupId || undefined,
        batchIds: selectedBatchIds.length > 0 ? selectedBatchIds : undefined,
        defaultStatus: defaultStatus || undefined,
      };

      const response = await apiClient.bulkPasteStudents(request);
      setImportResult(response);

      if (response.errorCount === 0) {
        toast.success(
          `Successfully imported ${response.successCount} student${response.successCount !== 1 ? "s" : ""}`
        );
        // Reset form
        setCsvText("");
        setSimpleMapping({ name: "", email: "", discordId: "", phone: "", tags: "" });
        setFlexibleMapping({
          "student.name": "",
          "student.email": "",
          "student.discordId": "",
          "student.tags": "",
          phones: [],
          "enrollment.groupName": "",
          "enrollment.courseName": "",
          "enrollment.status": "",
        });
        setImportResult(null);
        setSelectedGroupId(groupId || "");
        setSelectedBatchIds([]);
        setDefaultStatus("");
        onSuccess?.();
        onOpenChange(false);
      } else if (response.successCount > 0) {
        toast.warning(
          `Imported ${response.successCount} student${response.successCount !== 1 ? "s" : ""}, but ${response.errorCount} row${response.errorCount !== 1 ? "s" : ""} had errors`
        );
      } else {
        toast.error(`Import failed: ${response.errorCount} error${response.errorCount !== 1 ? "s" : ""}`);
      }
    } catch (error: unknown) {
      const errorMessage = translateApiError(error);
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  }, [parsedData, mappingMode, simpleMapping, flexibleMapping, selectedGroupId, selectedBatchIds, groupId, defaultStatus, onSuccess, onOpenChange]);

  const handleClose = useCallback(() => {
    if (!isImporting) {
      setCsvText("");
      setSimpleMapping({ name: "", email: "", discordId: "", phone: "", tags: "" });
      setFlexibleMapping({
        "student.name": "",
        "student.email": "",
        "student.discordId": "",
        "student.tags": "",
        phones: [],
        "enrollment.groupName": "",
        "enrollment.courseName": "",
        "enrollment.status": "",
      });
      setImportResult(null);
      setSelectedGroupId(groupId || "");
      setDefaultStatus("");
      setMappingMode("simple");
      onOpenChange(false);
    }
  }, [isImporting, groupId, onOpenChange]);

  // Helper to add phone field
  const addPhoneField = useCallback(() => {
    const nextIndex = flexibleMapping.phones.length;
    setFlexibleMapping((prev) => ({
      ...prev,
      phones: [...prev.phones, { key: `phone.${nextIndex}` as PhoneKey, column: "" }],
    }));
  }, [flexibleMapping.phones.length]);

  // Helper to remove phone field
  const removePhoneField = useCallback((index: number) => {
    setFlexibleMapping((prev) => ({
      ...prev,
      phones: prev.phones.filter((_, i) => i !== index),
    }));
  }, []);

  // Helper to update phone field
  const updatePhoneField = useCallback((index: number, key: PhoneKey, column: string) => {
    setFlexibleMapping((prev) => {
      const newPhones = [...prev.phones];
      newPhones[index] = { key, column };
      return { ...prev, phones: newPhones };
    });
  }, []);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogClose onClose={handleClose} />
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Bulk Import Students</DialogTitle>
        </DialogHeader>

        <div className="space-y-6 overflow-y-auto flex-1 pr-2">
          {/* CSV Paste Area */}
          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={inputMode === "paste" ? "default" : "outline"}
                  onClick={() => setInputMode("paste")}
                  disabled={isImporting}
                >
                  Paste CSV
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={inputMode === "upload" ? "default" : "outline"}
                  onClick={() => setInputMode("upload")}
                  disabled={isImporting}
                >
                  Upload File
                </Button>
              </div>
              {rowCount > 0 && (
                <div className="flex flex-wrap items-center gap-4 text-xs text-[var(--groups1-text-secondary)]">
                  <span>
                    {rowCount} {rowCount === 1 ? "row" : "rows"}
                  </span>
                  {validationIssues.length > 0 && (
                    <span className="text-yellow-600 dark:text-yellow-400">
                      {validationIssues.length} {validationIssues.length === 1 ? "issue" : "issues"} found
                    </span>
                  )}
                  {estimatedTime && <span>Est. time: {estimatedTime}</span>}
                </div>
              )}
            </div>
            {inputMode === "paste" ? (
              <>
                <Label htmlFor="csv-text">Paste CSV Data</Label>
                <textarea
                  ref={textareaRef}
                  id="csv-text"
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder="Paste your CSV data here...&#10;Example:&#10;Full Name,Email,Phone,Tags&#10;John Doe,john@example.com,1234567890,tag1, tag2"
                  className={cn(
                    "w-full min-h-[200px] max-h-[500px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                    "bg-[var(--groups1-surface)] text-[var(--groups1-text)] placeholder:text-[var(--groups1-text-secondary)]",
                    "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] focus:border-[var(--groups1-primary)]",
                    "font-mono overflow-y-auto resize-none"
                  )}
                  disabled={isImporting}
                  aria-label="CSV data input"
                  aria-describedby={validationIssues.length > 0 ? "csv-validation-help" : undefined}
                />
              </>
            ) : (
              <div
                className="rounded-lg border-2 border-dashed border-[var(--groups1-border)] bg-[var(--groups1-muted)] p-6 text-center"
                onDrop={handleFileDrop}
                onDragOver={handleDragOver}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  className="hidden"
                  onChange={handleFileInputChange}
                  disabled={isImporting}
                />
                <Upload className="w-8 h-8 mx-auto text-[var(--groups1-text-secondary)]" />
                <p className="mt-3 text-sm text-[var(--groups1-text)]">Drag & drop your CSV or Excel file</p>
                <p className="text-xs text-[var(--groups1-text-secondary)]">Supported: .csv, .xlsx, .xls</p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isImporting}
                    className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                  >
                    Browse files
                  </Button>
                  {uploadedFileName && (
                    <Button type="button" variant="ghost" size="sm" onClick={clearUploadedFile} disabled={isImporting}>
                      Clear
                    </Button>
                  )}
                </div>
                {uploadedFileName ? (
                  <p className="mt-2 text-xs text-[var(--groups1-text-secondary)]">Selected: {uploadedFileName}</p>
                ) : (
                  <p className="mt-2 text-xs text-[var(--groups1-text-secondary)]">Max size: 5MB</p>
                )}
              </div>
            )}
            {parsedData && rowCount > 0 && (
              <p className="text-xs text-[var(--groups1-text-secondary)]">
                Detected {rowCount} row{rowCount !== 1 ? "s" : ""} with {headers.length} column{headers.length !== 1 ? "s" : ""}
              </p>
            )}
            {parsedData && parsedData.errors.length > 0 && (
              <div className="text-xs text-red-500">
                CSV parsing errors: {parsedData.errors.map((error: { message: string }) => error.message).join(", ")}
              </div>
            )}
            {rowCount > 0 && validationIssues.length > 0 && (
              <div className="text-xs text-yellow-600 dark:text-yellow-400" id="csv-validation-help">
                <p className="font-medium mb-1">Validation Issues:</p>
                <ul className="list-disc list-inside space-y-0.5">
                  {validationIssues.slice(0, 5).map((issue, idx) => (
                    <li key={idx}>Row {issue.rowIndex}: {issue.message}</li>
                  ))}
                  {validationIssues.length > 5 && (
                    <li>...and {validationIssues.length - 5} more</li>
                  )}
                </ul>
              </div>
            )}
          </div>

          {/* Preview */}
          {previewRows.length > 0 && headers.length > 0 && (
            <div className="space-y-2 border-t border-[var(--groups1-border)] pt-4">
              <Label>Preview (first {Math.min(previewRows.length, 5)} rows)</Label>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border border-[var(--groups1-border)] rounded-lg">
                  <thead>
                    <tr className="bg-[var(--groups1-secondary)]">
                      {headers.slice(0, 6).map((header) => (
                        <th key={header} className="px-2 py-1 text-left border-b border-[var(--groups1-border)] font-medium">
                          {header}
                        </th>
                      ))}
                      {headers.length > 6 && (
                        <th className="px-2 py-1 text-left border-b border-[var(--groups1-border)] font-medium">
                          ...
                        </th>
                      )}
                    </tr>
                  </thead>
                  <tbody>
                    {previewRows.map((row, idx) => (
                      <tr key={idx} className="border-b border-[var(--groups1-border)] last:border-b-0">
                        {headers.slice(0, 6).map((header) => (
                          <td key={header} className="px-2 py-1 text-[var(--groups1-text-secondary)]">
                            {String(row[header] ?? "").slice(0, 30)}
                            {String(row[header] ?? "").length > 30 ? "..." : ""}
                          </td>
                        ))}
                        {headers.length > 6 && (
                          <td className="px-2 py-1 text-[var(--groups1-text-secondary)]">...</td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Column Mapping */}
          {headers.length > 0 && (
            <div className="space-y-4 border-t border-[var(--groups1-border)] pt-4">
              <div className="flex items-center justify-between">
                <Label>Column Mapping</Label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setMappingMode("simple")}
                    disabled={isImporting}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                      mappingMode === "simple"
                        ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-[var(--groups1-primary)]"
                        : "bg-[var(--groups1-surface)] text-[var(--groups1-text)] border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    Simple
                  </button>
                  <button
                    type="button"
                    onClick={() => setMappingMode("advanced")}
                    disabled={isImporting}
                    className={cn(
                      "px-3 py-1.5 text-xs rounded-lg border transition-colors",
                      mappingMode === "advanced"
                        ? "bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] border-[var(--groups1-primary)]"
                        : "bg-[var(--groups1-surface)] text-[var(--groups1-text)] border-[var(--groups1-border)] hover:bg-[var(--groups1-secondary)]",
                      "disabled:opacity-50 disabled:cursor-not-allowed"
                    )}
                  >
                    Advanced
                  </button>
                </div>
              </div>

              {mappingMode === "simple" ? (
                /* Simple Mapping UI */
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name-mapping" className="text-xs">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <select
                      id="name-mapping"
                      value={simpleMapping.name}
                      onChange={(e) => setSimpleMapping((prev) => ({ ...prev, name: e.target.value }))}
                      className={cn(
                        "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                        "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      disabled={isImporting}
                    >
                      <option value="">Select column...</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email-mapping" className="text-xs">
                      Email (optional)
                    </Label>
                    <select
                      id="email-mapping"
                      value={simpleMapping.email || ""}
                      onChange={(e) => setSimpleMapping((prev) => ({ ...prev, email: e.target.value || undefined }))}
                      className={cn(
                        "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                        "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      disabled={isImporting}
                    >
                      <option value="">None</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="discord-mapping" className="text-xs">
                      Discord ID (optional)
                    </Label>
                    <select
                      id="discord-mapping"
                      value={simpleMapping.discordId || ""}
                      onChange={(e) => setSimpleMapping((prev) => ({ ...prev, discordId: e.target.value || undefined }))}
                      className={cn(
                        "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                        "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      disabled={isImporting}
                    >
                      <option value="">None</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone-mapping" className="text-xs">
                      Phone (optional)
                    </Label>
                    <select
                      id="phone-mapping"
                      value={simpleMapping.phone || ""}
                      onChange={(e) => setSimpleMapping((prev) => ({ ...prev, phone: e.target.value || undefined }))}
                      className={cn(
                        "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                        "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      disabled={isImporting}
                    >
                      <option value="">None</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="tags-mapping" className="text-xs">
                      Tags (optional)
                    </Label>
                    <select
                      id="tags-mapping"
                      value={simpleMapping.tags || ""}
                      onChange={(e) => setSimpleMapping((prev) => ({ ...prev, tags: e.target.value || undefined }))}
                      className={cn(
                        "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                        "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      disabled={isImporting}
                    >
                      <option value="">None</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                /* Advanced Mapping UI */
                <div className="space-y-4">
                  {/* Student Fields */}
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase">Student Fields</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="student-name-mapping" className="text-xs">
                          Student Name <span className="text-red-500">*</span>
                        </Label>
                        <select
                          id="student-name-mapping"
                          value={flexibleMapping["student.name"]}
                          onChange={(e) => setFlexibleMapping((prev) => ({ ...prev, "student.name": e.target.value }))}
                          className={cn(
                            "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                            "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                          disabled={isImporting}
                        >
                          <option value="">Select column...</option>
                          {headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="student-email-mapping" className="text-xs">
                          Student Email (optional)
                        </Label>
                        <select
                          id="student-email-mapping"
                          value={flexibleMapping["student.email"] || ""}
                          onChange={(e) => setFlexibleMapping((prev) => ({ ...prev, "student.email": e.target.value || undefined }))}
                          className={cn(
                            "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                            "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                          disabled={isImporting}
                        >
                          <option value="">None</option>
                          {headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>

                  <div className="space-y-2">
                    <Label htmlFor="student-discord-mapping" className="text-xs">
                      Discord ID (optional)
                    </Label>
                    <select
                      id="student-discord-mapping"
                      value={flexibleMapping["student.discordId"] || ""}
                      onChange={(e) =>
                        setFlexibleMapping((prev) => ({
                          ...prev,
                          "student.discordId": e.target.value || undefined,
                        }))
                      }
                      className={cn(
                        "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                        "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                        "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                        "disabled:opacity-50 disabled:cursor-not-allowed"
                      )}
                      disabled={isImporting}
                    >
                      <option value="">None</option>
                      {headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>

                      <div className="space-y-2">
                        <Label htmlFor="student-tags-mapping" className="text-xs">
                          Student Tags (optional)
                        </Label>
                        <select
                          id="student-tags-mapping"
                          value={flexibleMapping["student.tags"] || ""}
                          onChange={(e) => setFlexibleMapping((prev) => ({ ...prev, "student.tags": e.target.value || undefined }))}
                          className={cn(
                            "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                            "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                          disabled={isImporting}
                        >
                          <option value="">None</option>
                          {headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Phone Fields */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase">Phone Numbers</div>
                      <Button
                        type="button"
                        size="sm"
                        onClick={addPhoneField}
                        disabled={isImporting}
                        className="h-7 text-xs border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Phone
                      </Button>
                    </div>
                    {flexibleMapping.phones.map((phone, index) => (
                      <div key={index} className="flex items-center gap-2">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <select
                            value={phone.key}
                            onChange={(e) => updatePhoneField(index, e.target.value as PhoneKey, phone.column)}
                            className={cn(
                              "px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                              "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                              "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                            disabled={isImporting}
                          >
                            <option value={`phone.${index}`}>{`phone.${index}`}</option>
                            <option value="phone.primary">phone.primary</option>
                            <option value="phone.secondary">phone.secondary</option>
                            <option value="phone.alternate">phone.alternate</option>
                          </select>
                          <select
                            value={phone.column}
                            onChange={(e) => updatePhoneField(index, phone.key, e.target.value)}
                            className={cn(
                              "px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                              "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                              "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                              "disabled:opacity-50 disabled:cursor-not-allowed"
                            )}
                            disabled={isImporting}
                          >
                            <option value="">Select column...</option>
                            {headers.map((header) => (
                              <option key={header} value={header}>
                                {header}
                              </option>
                            ))}
                          </select>
                        </div>
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => removePhoneField(index)}
                          disabled={isImporting}
                          className="h-9 w-9 p-0 border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    ))}
                    {flexibleMapping.phones.length === 0 && (
                      <p className="text-xs text-[var(--groups1-text-secondary)]">No phone fields added. Click "Add Phone" to map phone columns.</p>
                    )}
                  </div>

                  {/* Enrollment Fields */}
                  <div className="space-y-3">
                    <div className="text-xs font-medium text-[var(--groups1-text-secondary)] uppercase">Enrollment Fields</div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="enrollment-group-mapping" className="text-xs">
                          Group Name (optional)
                        </Label>
                        <select
                          id="enrollment-group-mapping"
                          value={flexibleMapping["enrollment.groupName"] || ""}
                          onChange={(e) => setFlexibleMapping((prev) => ({ ...prev, "enrollment.groupName": e.target.value || undefined }))}
                          className={cn(
                            "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                            "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                          disabled={isImporting}
                        >
                          <option value="">None</option>
                          {headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="enrollment-course-mapping" className="text-xs">
                          Course Name (optional)
                        </Label>
                        <select
                          id="enrollment-course-mapping"
                          value={flexibleMapping["enrollment.courseName"] || ""}
                          onChange={(e) => setFlexibleMapping((prev) => ({ ...prev, "enrollment.courseName": e.target.value || undefined }))}
                          className={cn(
                            "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                            "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                          disabled={isImporting}
                        >
                          <option value="">None</option>
                          {headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="enrollment-status-mapping" className="text-xs">
                          Status (optional)
                        </Label>
                        <select
                          id="enrollment-status-mapping"
                          value={flexibleMapping["enrollment.status"] || ""}
                          onChange={(e) => setFlexibleMapping((prev) => ({ ...prev, "enrollment.status": e.target.value || undefined }))}
                          className={cn(
                            "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                            "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                            "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                            "disabled:opacity-50 disabled:cursor-not-allowed"
                          )}
                          disabled={isImporting}
                        >
                          <option value="">None</option>
                          {headers.map((header) => (
                            <option key={header} value={header}>
                              {header}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Group Selection */}
          {!groupId && (
            <div className="space-y-2 border-t border-[var(--groups1-border)] pt-4">
              <Label htmlFor="group-select" className="flex items-center gap-1 text-sm font-medium">
                Assign to Group
                {isGroupSelectionRequired ? (
                  <span className="text-red-500">*</span>
                ) : (
                  <span className="text-[11px] uppercase tracking-wide text-[var(--groups1-text-secondary)]">
                    Optional
                  </span>
                )}
              </Label>
              <select
                id="group-select"
                value={selectedGroupId}
                onChange={(e) => setSelectedGroupId(e.target.value)}
                className={cn(
                  "w-full px-3 py-2 text-sm rounded-lg border",
                  "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                  "focus:outline-none focus:ring-2",
                  "disabled:opacity-50 disabled:cursor-not-allowed",
                  isGroupSelectionMissing
                    ? "border-red-500 focus:ring-red-500"
                    : "border-[var(--groups1-border)] focus:ring-[var(--groups1-focus-ring)]"
                )}
                disabled={isImporting}
                aria-required={isGroupSelectionRequired}
                aria-invalid={isGroupSelectionMissing}
              >
                <option value="">
                  {isGroupSelectionRequired ? "Select a group..." : "No group assignment"}
                </option>
                {groups?.map((group) => (
                  <option key={group.id} value={group.id}>
                    {group.name}
                  </option>
                ))}
              </select>
              <p
                className={cn(
                  "text-xs",
                  isGroupSelectionMissing ? "text-red-600" : "text-[var(--groups1-text-secondary)]"
                )}
              >
                {isGroupSelectionMissing
                  ? "Select a group or map a group column to enroll imported students."
                  : "Used as the fallback when your CSV does not include a group column."}
              </p>
            </div>
          )}

          {/* Batch Selection */}
          <div className="space-y-2 border-t border-[var(--groups1-border)] pt-4">
            <Label htmlFor="batch-select" className="text-sm font-medium">
              Assign to Batches (optional)
            </Label>
            <BatchSelector
              value={selectedBatchIds}
              onChange={(value) =>
                setSelectedBatchIds(Array.isArray(value) ? value : value ? [value] : [])
              }
              multiple={true}
              placeholder="Select batches"
              isActiveOnly={true}
              className="w-full"
            />
            <p className="text-xs text-[var(--groups1-text-secondary)]">
              Students will be assigned to all selected batches. Leave empty to skip batch assignment.
            </p>
          </div>

          {/* Default Status */}
          <div className="space-y-2 border-t border-[var(--groups1-border)] pt-4">
            <Label htmlFor="default-status" className="text-sm font-medium">
              Default Status (optional)
            </Label>
            <select
              id="default-status"
              value={defaultStatus}
              onChange={(event) =>
                setDefaultStatus(
                  event.target.value === ""
                    ? ""
                    : (event.target.value as EnrollmentStatus)
                )
              }
              className={cn(
                "w-full px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)]",
                "bg-[var(--groups1-surface)] text-[var(--groups1-text)]",
                "focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)]",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
              disabled={isImporting}
            >
              <option value="">Use workspace default (NEW)</option>
              {enrollmentStatusOptions.map((status) => (
                <option key={status} value={status}>
                  {status.replace("_", " ")}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--groups1-text-secondary)]">
              Applied to enrollments when the CSV does not supply a status column or value.
            </p>
          </div>

          {/* Import Results */}
          {importResult && (
            <div
              className={cn(
                "p-4 rounded-lg border",
                importResult.errorCount === 0
                  ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                  : "bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800"
              )}
            >
              <div className="flex items-start gap-3">
                {importResult.errorCount === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 space-y-2">
                  <div className="text-sm font-medium text-[var(--groups1-text)]">
                    Import Results
                  </div>
                  <div className="text-xs text-[var(--groups1-text-secondary)] space-y-1">
                    <div>Total rows: {importResult.totalRows}</div>
                    <div className="text-green-600 dark:text-green-400">
                      Success: {importResult.successCount}
                    </div>
                    {importResult.errorCount > 0 && (
                      <div className="text-red-600 dark:text-red-400">
                        Errors: {importResult.errorCount}
                      </div>
                    )}
                    {importResult.enrollmentSuccessCount !== undefined && (
                      <div>Enrollments: {importResult.enrollmentSuccessCount}</div>
                    )}
                  </div>
                  {importResult.errors.length > 0 && (
                    <div className="mt-3 space-y-1 max-h-32 overflow-y-auto">
                      <div className="text-xs font-medium text-[var(--groups1-text)]">Error Details:</div>
                      {importResult.errors.slice(0, 10).map((error, idx) => {
                        const friendlyMessage = translateImportError(error.message);
                        return (
                          <div key={idx} className="text-xs text-red-600 dark:text-red-400">
                            Row {error.rowIndex + 1}: {friendlyMessage}
                            {error.message !== friendlyMessage && (
                              <span className="text-[var(--groups1-text-secondary)] ml-1">
                                (Check row {error.rowIndex + 1} in your CSV)
                              </span>
                            )}
                          </div>
                        );
                      })}
                      {importResult.errors.length > 10 && (
                        <div className="text-xs text-[var(--groups1-text-secondary)]">
                          ... and {importResult.errors.length - 10} more errors
                        </div>
                      )}
                    </div>
                  )}
                  {importResult.errorCount > 0 && (
                    <div className="pt-2 text-right">
                      <Button size="sm" onClick={handleDownloadErrors} className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]">
                        <Download className="w-4 h-4 mr-2" />
                        Download CSV
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 border-t border-[var(--groups1-border)] pt-4 flex-shrink-0">
            <Button
              onClick={handleClose}
              disabled={isImporting}
              className="border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={
                isImporting ||
                !parsedData ||
                rowCount === 0 ||
                (mappingMode === "simple" && !simpleMapping.name) ||
                (mappingMode === "advanced" && !flexibleMapping["student.name"]) ||
                isGroupSelectionMissing
              }
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Importing...
                </>
              ) : (
                "Import"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

