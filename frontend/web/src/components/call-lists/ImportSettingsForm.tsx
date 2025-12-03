"use client";

import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

export interface ImportSettingsFormProps {
  matchingStats: {
    willMatch: number;
    willCreate: number;
    willSkip: number;
  };
  settings: {
    matchBy: 'email' | 'phone' | 'name' | 'email_or_phone';
    createNewStudents: boolean;
    skipDuplicates: boolean;
  };
  onSettingsChange: (settings: ImportSettingsFormProps['settings']) => void;
}

export function ImportSettingsForm({
  matchingStats,
  settings,
  onSettingsChange,
}: ImportSettingsFormProps) {
  const handleMatchByChange = (matchBy: 'email' | 'phone' | 'name' | 'email_or_phone') => {
    onSettingsChange({ ...settings, matchBy });
  };

  const handleToggle = (field: 'createNewStudents' | 'skipDuplicates') => {
    onSettingsChange({ ...settings, [field]: !settings[field] });
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="block text-sm font-medium text-[var(--groups1-text)] mb-3">
          Match Strategy <span className="text-red-500">*</span>
        </Label>
        <div className="space-y-2">
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[var(--groups1-secondary)]">
            <input
              type="radio"
              name="matchBy"
              value="email"
              checked={settings.matchBy === 'email'}
              onChange={() => handleMatchByChange('email')}
              className="text-[var(--groups1-primary)]"
            />
            <span className="text-sm text-[var(--groups1-text)]">Email only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[var(--groups1-secondary)]">
            <input
              type="radio"
              name="matchBy"
              value="phone"
              checked={settings.matchBy === 'phone'}
              onChange={() => handleMatchByChange('phone')}
              className="text-[var(--groups1-primary)]"
            />
            <span className="text-sm text-[var(--groups1-text)]">Phone only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[var(--groups1-secondary)]">
            <input
              type="radio"
              name="matchBy"
              value="name"
              checked={settings.matchBy === 'name'}
              onChange={() => handleMatchByChange('name')}
              className="text-[var(--groups1-primary)]"
            />
            <span className="text-sm text-[var(--groups1-text)]">Name only</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer p-2 rounded hover:bg-[var(--groups1-secondary)]">
            <input
              type="radio"
              name="matchBy"
              value="email_or_phone"
              checked={settings.matchBy === 'email_or_phone'}
              onChange={() => handleMatchByChange('email_or_phone')}
              className="text-[var(--groups1-primary)]"
            />
            <span className="text-sm text-[var(--groups1-text)]">
              Email or Phone <span className="text-xs text-[var(--groups1-text-secondary)]">(recommended)</span>
            </span>
          </label>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.createNewStudents}
            onChange={() => handleToggle('createNewStudents')}
            className="rounded border-[var(--groups1-border)]"
          />
          <span className="text-sm text-[var(--groups1-text)]">
            Create new students if not found
          </span>
        </label>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={settings.skipDuplicates}
            onChange={() => handleToggle('skipDuplicates')}
            className="rounded border-[var(--groups1-border)]"
          />
          <span className="text-sm text-[var(--groups1-text)]">
            Skip duplicate students
          </span>
        </label>
      </div>

      <div>
        <Label className="block text-sm font-medium text-[var(--groups1-text)] mb-3">
          Expected Results
        </Label>
        <Card variant="groups1">
          <CardContent variant="groups1" className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-semibold text-[var(--groups1-text)]">
                  {matchingStats.willMatch}
                </div>
                <div className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                  Will Match
                </div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-[var(--groups1-text)]">
                  {matchingStats.willCreate}
                </div>
                <div className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                  Will Create
                </div>
              </div>
              <div>
                <div className="text-2xl font-semibold text-[var(--groups1-text)]">
                  {matchingStats.willSkip}
                </div>
                <div className="text-xs text-[var(--groups1-text-secondary)] mt-1">
                  Will Skip
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

