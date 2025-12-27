"use client";

import { useState, useCallback, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { apiClient } from "@/lib/api-client";
import { toast } from "sonner";
import { Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import type { BulkPasteCallListRequest, BulkPasteCallListResponse, BulkPasteCallListMapping, BulkPasteCallListMappingOld, BulkPasteCallListMappingFlexible } from "@/types/call-lists.types";
import Papa from "papaparse";
import * as XLSX from "xlsx";

export interface BulkPasteCallListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type MappingMode = "simple" | "flexible";

export function BulkPasteCallListDialog({
  open,
  onOpenChange,
  onSuccess,
}: BulkPasteCallListDialogProps) {
  const router = useRouter();
  const [csvText, setCsvText] = useState("");
  const [listName, setListName] = useState("");
  const [description, setDescription] = useState("");
  const [mappingMode, setMappingMode] = useState<MappingMode>("simple");
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<BulkPasteCallListResponse | null>(null);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  
  // Simple mapping (old format)
  const [simpleMapping, setSimpleMapping] = useState({
    name: "",
    email: "",
    phone: "",
  });

  // Flexible mapping (new format) - using a helper structure
  const [flexibleMapping, setFlexibleMapping] = useState<{
    "student.name": string;
    "student.email": string;
    "student.discordId": string;
    "student.tags": string;
    phones: Array<{ key: string; column: string }>;
  }>({
    "student.name": "",
    "student.email": "",
    "student.discordId": "",
    "student.tags": "",
    phones: [],
  });

  const [matchBy, setMatchBy] = useState<'email' | 'phone' | 'email_or_phone' | 'name'>('email_or_phone');
  const [createNewStudents, setCreateNewStudents] = useState(true);
  const [skipDuplicates, setSkipDuplicates] = useState(true);

  // Parse CSV text
  const parsedData = useMemo(() => {
    if (!csvText.trim()) return null;

    try {
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim(),
      });

      if (result.errors.length > 0 && result.errors.some(e => e.type !== 'Quotes')) {
        return null;
      }

      return {
        headers: result.meta.fields || [],
        rows: result.data as Array<Record<string, any>>,
      };
    } catch {
      return null;
    }
  }, [csvText]);

  // Auto-detect column mapping
  const autoDetectMapping = useCallback(() => {
    if (!parsedData || parsedData.headers.length === 0) return;

    const headers = parsedData.headers;
    const namePatterns = ['name', 'student name', 'full name', 'student_name', 'full_name'];
    const emailPatterns = ['email', 'e-mail', 'email address'];
    const phonePatterns = ['phone', 'mobile', 'phone number', 'phone_number', 'mobile number', 'contact'];

    if (mappingMode === "simple") {
      const detected: Partial<typeof simpleMapping> = {};
      
      for (const header of headers) {
        const lowerHeader = header.toLowerCase();
        if (!detected.name && namePatterns.some(p => lowerHeader.includes(p))) {
          detected.name = header;
        } else if (!detected.email && emailPatterns.some(p => lowerHeader.includes(p))) {
          detected.email = header;
        } else if (!detected.phone && phonePatterns.some(p => lowerHeader.includes(p))) {
          detected.phone = header;
        }
      }

      setSimpleMapping({
        name: detected.name || "",
        email: detected.email || "",
        phone: detected.phone || "",
      });
      } else {
        const detected = {
          "student.name": "",
          "student.email": "",
          phones: [] as Array<{ key: string; column: string }>,
        };

        for (const header of headers) {
          const lowerHeader = header.toLowerCase();
          if (!detected["student.name"] && namePatterns.some(p => lowerHeader.includes(p))) {
            detected["student.name"] = header;
          } else if (!detected["student.email"] && emailPatterns.some(p => lowerHeader.includes(p))) {
            detected["student.email"] = header;
          } else if (phonePatterns.some(p => lowerHeader.includes(p))) {
            const phoneIndex = detected.phones.length;
            detected.phones.push({ key: `phone.${phoneIndex}`, column: header });
          }
        }

        setFlexibleMapping({
          "student.name": detected["student.name"] || "",
          "student.email": detected["student.email"] || "",
          "student.discordId": "",
          "student.tags": "",
          phones: detected.phones || [],
        });
      }
  }, [parsedData, mappingMode]);

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
          throw new Error("Unsupported file type. Please upload CSV or Excel files.");
        }
        
        setCsvText(nextText);
        setUploadedFileName(file.name);
        toast.success("File parsed. Review the preview before creating call list.");
      } catch (error: any) {
        console.error(error);
        toast.error(error?.message || "Failed to read the selected file. Please upload a CSV or Excel file.");
      }
    },
    []
  );

  const handleImport = useCallback(async () => {
    if (!listName.trim() || listName.trim().length < 2) {
      toast.error("Call list name must be at least 2 characters");
      return;
    }

    if (!csvText.trim()) {
      toast.error("Please paste CSV data");
      return;
    }

    if (!parsedData || parsedData.rows.length === 0) {
      toast.error("No valid data found in pasted content");
      return;
    }

    // Validate mapping
    if (mappingMode === "simple") {
      if (!simpleMapping.name) {
        toast.error("Please map the name column");
        return;
      }
    } else {
      if (!flexibleMapping["student.name"]) {
        toast.error("Please map the student.name column");
        return;
      }
    }

    setIsImporting(true);
    try {
      // Build mapping based on mode
      let mapping: BulkPasteCallListMapping;
      if (mappingMode === "simple") {
        // Old format
        mapping = {
          name: simpleMapping.name,
          email: simpleMapping.email || undefined,
          phone: simpleMapping.phone || undefined,
        } as BulkPasteCallListMappingOld;
      } else {
        // New flexible format
        const flexibleMap: BulkPasteCallListMappingFlexible = {
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
          flexibleMap[phone.key as keyof BulkPasteCallListMappingFlexible] = phone.column as any;
        });
        mapping = flexibleMap;
      }

      const request: BulkPasteCallListRequest = {
        name: listName.trim(),
        description: description.trim() || undefined,
        data: csvText,
        columnMapping: mapping,
        matchBy,
        createNewStudents,
        skipDuplicates,
      };

      const response = await apiClient.bulkPasteCallList(request);
      setImportResult(response);

      if (response.stats.errors === 0) {
        toast.success(
          `Call list created: ${response.stats.matched} matched, ${response.stats.created} created, ${response.stats.added} added`
        );
        // Reset form
        setCsvText("");
        setListName("");
        setDescription("");
        setSimpleMapping({ name: "", email: "", phone: "" });
        setFlexibleMapping({
          "student.name": "",
          "student.email": "",
          "student.discordId": "",
          "student.tags": "",
          phones: [],
        });
        setImportResult(null);
        setUploadedFileName(null);
        onSuccess?.();
        onOpenChange(false);
        // Navigate to the created call list
        router.push(`/app/call-lists/${response.callList.id}`);
      } else if (response.stats.added > 0) {
        toast.warning(
          `Call list created with ${response.stats.added} students, but ${response.stats.errors} error${response.stats.errors !== 1 ? "s" : ""} occurred`
        );
      } else {
        toast.error(`Import failed: ${response.stats.errors} error${response.stats.errors !== 1 ? "s" : ""}`);
      }
    } catch (error: any) {
      console.error("Bulk paste error:", error);
      const errorMessage = error?.message || error?.error?.message || "Failed to create call list";
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  }, [csvText, listName, description, parsedData, mappingMode, simpleMapping, flexibleMapping, matchBy, createNewStudents, skipDuplicates, onSuccess, onOpenChange, router]);

  const handleClose = useCallback(() => {
    if (!isImporting) {
      setCsvText("");
      setListName("");
      setDescription("");
      setUploadedFileName(null);
      setSimpleMapping({ name: "", email: "", phone: "" });
      setFlexibleMapping({
        "student.name": "",
        "student.email": "",
        "student.discordId": "",
        "student.tags": "",
        phones: [],
      });
      setImportResult(null);
      onOpenChange(false);
    }
  }, [isImporting, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogClose onClose={handleClose} />
        <DialogHeader>
          <DialogTitle>Create Call List from Bulk Paste</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Call List Details */}
          <div className="space-y-3">
            <div>
              <Label className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1">
                Call List Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={listName}
                onChange={(e) => setListName(e.target.value)}
                placeholder="e.g., Follow-up Calls - Batch 1"
                className="bg-[var(--groups1-background)] border-[var(--groups1-border)]"
                disabled={isImporting}
              />
            </div>

            <div>
              <Label className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-1">
                Description <span className="text-gray-400 text-xs">(Optional)</span>
              </Label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter call list description..."
                className="w-full min-h-[80px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] resize-y"
                disabled={isImporting}
              />
            </div>
          </div>

          {/* CSV Data Input */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="block text-left text-sm font-medium text-[var(--groups1-text)]">
                Data Source <span className="text-red-500">*</span>
              </Label>
              {parsedData && parsedData.headers.length > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={autoDetectMapping}
                  className="text-xs"
                >
                  Auto-detect Columns
                </Button>
              )}
            </div>
            
            {/* File Upload Option */}
            <div className="mb-3">
              <input
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    void handleFileUpload(file);
                  }
                  // Reset input to allow re-selecting same file
                  e.target.value = "";
                }}
                className="hidden"
                id="file-upload-input"
                disabled={isImporting}
              />
              <label
                htmlFor="file-upload-input"
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)] cursor-pointer disabled:opacity-70 dark:disabled:opacity-75 disabled:cursor-not-allowed"
              >
                <FileText className="w-4 h-4" />
                {uploadedFileName ? `Change File (${uploadedFileName})` : "Upload CSV/Excel File"}
              </label>
              {uploadedFileName && (
                <span className="ml-2 text-xs text-[var(--groups1-text-secondary)]">
                  File: {uploadedFileName}
                </span>
              )}
            </div>
            
            {/* Divider */}
            <div className="flex items-center gap-2 my-3">
              <div className="flex-1 border-t border-[var(--groups1-border)]"></div>
              <span className="text-xs text-[var(--groups1-text-secondary)]">OR</span>
              <div className="flex-1 border-t border-[var(--groups1-border)]"></div>
            </div>
            
            {/* Paste Option */}
            <div>
              <Label className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-2">
                Paste CSV Data
              </Label>
              <textarea
                value={csvText}
                onChange={(e) => {
                  setCsvText(e.target.value);
                  setUploadedFileName(null); // Clear file name when pasting
                }}
                placeholder="Paste CSV data here (with headers)...&#10;Example:&#10;Name,Email,Phone&#10;John Doe,john@example.com,1234567890&#10;Jane Smith,jane@example.com,0987654321"
                className="w-full min-h-[200px] px-3 py-2 text-sm rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)] focus:outline-none focus:ring-2 focus:ring-[var(--groups1-focus-ring)] font-mono resize-y"
                disabled={isImporting}
              />
              {parsedData && (
                <p className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                  Detected {parsedData.headers.length} columns, {parsedData.rows.length} rows
                </p>
              )}
            </div>
          </div>

          {/* Mapping Mode Selection */}
          <div>
            <Label className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-2">
              Mapping Format
            </Label>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mappingMode"
                  value="simple"
                  checked={mappingMode === "simple"}
                  onChange={(e) => setMappingMode(e.target.value as MappingMode)}
                  disabled={isImporting}
                  className="rounded border-[var(--groups1-border)]"
                />
                <span className="text-sm text-[var(--groups1-text)]">Simple (Name, Email, Phone)</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="mappingMode"
                  value="flexible"
                  checked={mappingMode === "flexible"}
                  onChange={(e) => setMappingMode(e.target.value as MappingMode)}
                  disabled={isImporting}
                  className="rounded border-[var(--groups1-border)]"
                />
                <span className="text-sm text-[var(--groups1-text)]">Flexible (student.name, phone.0, etc.)</span>
              </label>
            </div>
          </div>

          {/* Column Mapping */}
          {parsedData && parsedData.headers.length > 0 && (
            <div className="space-y-3 p-4 rounded-lg bg-[var(--groups1-secondary)] border border-[var(--groups1-border)]">
              <Label className="block text-left text-sm font-medium text-[var(--groups1-text)]">
                Map Columns
              </Label>
              
              {mappingMode === "simple" ? (
                <div className="space-y-2">
                  <div>
                    <Label className="block text-xs text-[var(--groups1-text-secondary)] mb-1">
                      Name <span className="text-red-500">*</span>
                    </Label>
                    <select
                      value={simpleMapping.name}
                      onChange={(e) => setSimpleMapping({ ...simpleMapping, name: e.target.value })}
                      className="w-full px-2 py-1 text-sm rounded border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)]"
                      disabled={isImporting}
                    >
                      <option value="">Select column...</option>
                      {parsedData.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="block text-xs text-[var(--groups1-text-secondary)] mb-1">
                      Email (Optional)
                    </Label>
                    <select
                      value={simpleMapping.email}
                      onChange={(e) => setSimpleMapping({ ...simpleMapping, email: e.target.value })}
                      className="w-full px-2 py-1 text-sm rounded border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)]"
                      disabled={isImporting}
                    >
                      <option value="">Select column...</option>
                      {parsedData.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="block text-xs text-[var(--groups1-text-secondary)] mb-1">
                      Phone (Optional)
                    </Label>
                    <select
                      value={simpleMapping.phone}
                      onChange={(e) => setSimpleMapping({ ...simpleMapping, phone: e.target.value })}
                      className="w-full px-2 py-1 text-sm rounded border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)]"
                      disabled={isImporting}
                    >
                      <option value="">Select column...</option>
                      {parsedData.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <div>
                    <Label className="block text-xs text-[var(--groups1-text-secondary)] mb-1">
                      student.name <span className="text-red-500">*</span>
                    </Label>
                    <select
                      value={flexibleMapping["student.name"]}
                      onChange={(e) => setFlexibleMapping({ ...flexibleMapping, "student.name": e.target.value })}
                      className="w-full px-2 py-1 text-sm rounded border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)]"
                      disabled={isImporting}
                    >
                      <option value="">Select column...</option>
                      {parsedData.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <Label className="block text-xs text-[var(--groups1-text-secondary)] mb-1">
                      student.email (Optional)
                    </Label>
                    <select
                      value={flexibleMapping["student.email"] || ""}
                      onChange={(e) => setFlexibleMapping({ ...flexibleMapping, "student.email": e.target.value })}
                      className="w-full px-2 py-1 text-sm rounded border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)]"
                      disabled={isImporting}
                    >
                      <option value="">Select column...</option>
                      {parsedData.headers.map((header) => (
                        <option key={header} value={header}>
                          {header}
                        </option>
                      ))}
                    </select>
                  </div>
                  {/* Phone columns - map phone-like columns */}
                  {parsedData.headers
                    .filter(h => 
                      h.toLowerCase().includes('phone') || 
                      h.toLowerCase().includes('mobile') || 
                      h.toLowerCase().includes('contact')
                    )
                    .map((header, index) => {
                      const phoneMapping = flexibleMapping.phones.find(p => p.column === header);
                      return (
                        <div key={header}>
                          <Label className="block text-xs text-[var(--groups1-text-secondary)] mb-1">
                            phone.{index} ({header})
                          </Label>
                          <select
                            value={phoneMapping ? phoneMapping.key : ""}
                            onChange={(e) => {
                              const newPhones = [...flexibleMapping.phones];
                              const existingIndex = newPhones.findIndex(p => p.column === header);
                              if (e.target.value) {
                                if (existingIndex >= 0) {
                                  newPhones[existingIndex].key = e.target.value;
                                } else {
                                  newPhones.push({ key: e.target.value, column: header });
                                }
                              } else if (existingIndex >= 0) {
                                newPhones.splice(existingIndex, 1);
                              }
                              setFlexibleMapping({ ...flexibleMapping, phones: newPhones });
                            }}
                            className="w-full px-2 py-1 text-sm rounded border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)]"
                            disabled={isImporting}
                          >
                            <option value="">Not mapped</option>
                            <option value={`phone.${index}`}>phone.{index} (Primary if first)</option>
                          </select>
                        </div>
                      );
                    })}
                  {parsedData.headers.filter(h => 
                    h.toLowerCase().includes('phone') || 
                    h.toLowerCase().includes('mobile') || 
                    h.toLowerCase().includes('contact')
                  ).length === 0 && (
                    <p className="text-xs text-[var(--groups1-text-secondary)] italic">
                      No phone-like columns detected. You can manually map columns in flexible mode.
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Options */}
          <div className="space-y-2 p-4 rounded-lg bg-[var(--groups1-secondary)] border border-[var(--groups1-border)]">
            <Label className="block text-left text-sm font-medium text-[var(--groups1-text)] mb-2">
              Options
            </Label>
            <div className="space-y-2">
              <div>
                <Label className="block text-xs text-[var(--groups1-text-secondary)] mb-1">
                  Match By
                </Label>
                <select
                  value={matchBy}
                  onChange={(e) => setMatchBy(e.target.value as any)}
                  className="w-full px-2 py-1 text-sm rounded border border-[var(--groups1-border)] bg-[var(--groups1-background)] text-[var(--groups1-text)]"
                  disabled={isImporting}
                >
                  <option value="email_or_phone">Email or Phone</option>
                  <option value="email">Email</option>
                  <option value="phone">Phone</option>
                  <option value="name">Name</option>
                </select>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={createNewStudents}
                  onChange={(e) => setCreateNewStudents(e.target.checked)}
                  disabled={isImporting}
                  className="rounded border-[var(--groups1-border)]"
                />
                <span className="text-sm text-[var(--groups1-text)]">
                  Create new students if not found
                </span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipDuplicates}
                  onChange={(e) => setSkipDuplicates(e.target.checked)}
                  disabled={isImporting}
                  className="rounded border-[var(--groups1-border)]"
                />
                <span className="text-sm text-[var(--groups1-text)]">
                  Skip duplicates
                </span>
              </label>
            </div>
          </div>

          {/* Results */}
          {importResult && (
            <div className="p-4 rounded-lg bg-[var(--groups1-secondary)] border border-[var(--groups1-border)]">
              <div className="flex items-center gap-2 mb-2">
                {importResult.stats.errors === 0 ? (
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-yellow-500" />
                )}
                <Label className="text-sm font-medium text-[var(--groups1-text)]">
                  Import Results
                </Label>
              </div>
              <div className="text-sm text-[var(--groups1-text-secondary)] space-y-1">
                <p>Matched: {importResult.stats.matched}</p>
                <p>Created: {importResult.stats.created}</p>
                <p>Added: {importResult.stats.added}</p>
                <p>Duplicates: {importResult.stats.duplicates}</p>
                {importResult.stats.errors > 0 && (
                  <p className="text-red-500">Errors: {importResult.stats.errors}</p>
                )}
              </div>
              {importResult.errors.length > 0 && (
                <div className="mt-2 max-h-32 overflow-y-auto">
                  {importResult.errors.slice(0, 5).map((error, idx) => (
                    <p key={idx} className="text-xs text-red-500">{error}</p>
                  ))}
                  {importResult.errors.length > 5 && (
                    <p className="text-xs text-[var(--groups1-text-secondary)]">
                      ... and {importResult.errors.length - 5} more errors
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-[var(--groups1-border)]">
            <Button
              variant="outline"
              onClick={handleClose}
              disabled={isImporting}
              className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isImporting || !listName.trim() || !csvText.trim()}
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              {isImporting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Call List
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

