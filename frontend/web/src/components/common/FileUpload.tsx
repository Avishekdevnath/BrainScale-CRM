"use client";

import { useState, useCallback, useRef, DragEvent, ChangeEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Upload, X, File, AlertCircle, CheckCircle2 } from "lucide-react";

export interface FileUploadProps {
  accept?: string; // e.g., '.csv,.xlsx'
  maxSize?: number; // in bytes
  onFileSelect: (file: File) => void;
  disabled?: boolean;
  error?: string;
}

const DEFAULT_MAX_SIZE = 10 * 1024 * 1024; // 10MB

export function FileUpload({
  accept = ".csv,.xlsx",
  maxSize = DEFAULT_MAX_SIZE,
  onFileSelect,
  disabled = false,
  error,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateFile = useCallback(
    (file: File): string | null => {
      // Check file type
      const acceptedTypes = accept.split(",").map((type) => type.trim().toLowerCase());
      const fileExtension = "." + file.name.split(".").pop()?.toLowerCase();
      const isValidType = acceptedTypes.some((type) => {
        if (type.startsWith(".")) {
          return fileExtension === type;
        }
        return file.type === type;
      });

      if (!isValidType) {
        return `File type not supported. Please upload a ${accept} file.`;
      }

      // Check file size
      if (file.size > maxSize) {
        const maxSizeMB = (maxSize / (1024 * 1024)).toFixed(1);
        return `File size exceeds ${maxSizeMB}MB limit.`;
      }

      return null;
    },
    [accept, maxSize]
  );

  const handleFile = useCallback(
    (file: File) => {
      const error = validateFile(file);
      if (error) {
        setValidationError(error);
        setFile(null);
        return;
      }

      setValidationError(null);
      setFile(file);
      onFileSelect(file);
    },
    [validateFile, onFileSelect]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) {
      setIsDragging(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        handleFile(droppedFile);
      }
    },
    [disabled, handleFile]
  );

  const handleFileInputChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        handleFile(selectedFile);
      }
      // Reset input value to allow selecting the same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [handleFile]
  );

  const handleRemove = useCallback(() => {
    setFile(null);
    setValidationError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const displayError = error || validationError;

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 text-center transition-colors",
          isDragging
            ? "border-[var(--groups1-primary)] bg-[var(--groups1-primary)] bg-opacity-5"
            : displayError
            ? "border-red-500 dark:border-red-400 bg-red-50 dark:bg-red-900/20"
            : file
            ? "border-green-500 dark:border-green-400 bg-green-50 dark:bg-green-900/20"
            : "border-[var(--groups1-border)] bg-[var(--groups1-background)] hover:border-[var(--groups1-primary)] hover:bg-[var(--groups1-secondary)]",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          onChange={handleFileInputChange}
          disabled={disabled}
          className="hidden"
          aria-label="File input"
        />

        {file ? (
          <div className="space-y-2">
            <div className="flex items-center justify-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
              <File className="w-6 h-6 text-[var(--groups1-text)]" />
            </div>
            <div>
              <p className="font-medium text-[var(--groups1-text)]">{file.name}</p>
              <p className="text-sm text-[var(--groups1-text-secondary)]">
                {formatFileSize(file.size)}
              </p>
            </div>
            {!disabled && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleRemove}
                className="mt-2"
              >
                <X className="w-4 h-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <Upload className="w-12 h-12 mx-auto text-[var(--groups1-text-secondary)]" />
            <div>
              <p className="text-sm font-medium text-[var(--groups1-text)] mb-1">
                Drag and drop your file here, or
              </p>
              <Button
                type="button"
                variant="outline"
                onClick={handleBrowse}
                disabled={disabled}
                className="bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              >
                Browse Files
              </Button>
            </div>
            <p className="text-xs text-[var(--groups1-text-secondary)]">
              Supported formats: {accept.replace(/\./g, "").toUpperCase()}
              <br />
              Max file size: {formatFileSize(maxSize)}
            </p>
          </div>
        )}

        {displayError && (
          <div className="mt-4 flex items-center justify-center gap-2 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="w-4 h-4" />
            <span>{displayError}</span>
          </div>
        )}
      </div>
    </div>
  );
}

