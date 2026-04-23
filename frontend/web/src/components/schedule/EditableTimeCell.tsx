import React, { useState, useRef, useEffect } from 'react';

interface EditableCellProps {
  value: string;
  onSave: (newValue: string) => void;
  onCancel: () => void;
  pattern?: string; // Regex pattern for validation
}

export function EditableTimeCell({
  value,
  onSave,
  onCancel,
  pattern = '^\\d{2}:\\d{2}$',
}: EditableCellProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    }
  }, [isEditing]);

  const handleSave = () => {
    // Validate format
    const regex = new RegExp(pattern);
    if (!regex.test(inputValue)) {
      setError('Invalid format');
      return;
    }

    setError(null);
    onSave(inputValue);
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setInputValue(value);
      setError(null);
      setIsEditing(false);
      onCancel();
    }
  };

  const handleBlur = () => {
    if (inputValue !== value && inputValue.trim()) {
      handleSave();
    } else {
      setInputValue(value);
      setIsEditing(false);
      onCancel();
    }
  };

  if (!isEditing) {
    return (
      <td
        onClick={() => setIsEditing(true)}
        className="cursor-pointer px-4 py-2 hover:bg-blue-50 border"
      >
        {value}
      </td>
    );
  }

  return (
    <td className="px-4 py-2 border">
      <div className="flex flex-col gap-1">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          placeholder="HH:MM"
          className="px-2 py-1 border rounded text-sm"
        />
        {error && <span className="text-red-500 text-xs">{error}</span>}
      </div>
    </td>
  );
}
