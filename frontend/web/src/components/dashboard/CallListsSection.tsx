"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Phone } from "lucide-react";
import { CallListCard } from "./CallListCard";

export interface CallListsSectionProps {
  callLists: Array<{
    id: string;
    name: string;
    groupId: string | null;
    group: {
      id: string;
      name: string;
      batch: {
        id: string;
        name: string;
      } | null;
    } | null;
    itemCount: number;
    source: string;
    createdAt: string;
    updatedAt: string;
  }>;
  onCreateNew?: () => void;
  onEdit?: (callListId: string) => void;
  onDelete?: (callListId: string) => void;
  isAdmin?: boolean;
}

export function CallListsSection({
  callLists,
  onCreateNew,
  onEdit,
  onDelete,
  isAdmin = false,
}: CallListsSectionProps) {
  return (
    <Card variant="groups1">
      <CardHeader variant="groups1">
        <div className="flex items-center justify-between">
          <CardTitle>Call Lists</CardTitle>
          {onCreateNew && (
            <Button
              onClick={onCreateNew}
              size="sm"
              className="bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create New
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent variant="groups1" className="pb-6">
        {callLists.length === 0 ? (
          <div className="py-8 text-center">
            <Phone className="w-12 h-12 mx-auto mb-4 text-[var(--groups1-text-secondary)] opacity-50" />
            <p className="text-sm text-[var(--groups1-text-secondary)] mb-2">
              No call lists yet
            </p>
            {onCreateNew && (
              <Button
                onClick={onCreateNew}
                variant="outline"
                size="sm"
                className="mt-2 bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
              >
                Create your first call list
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {callLists.map((callList) => (
              <CallListCard
                key={callList.id}
                callList={callList}
                onEdit={onEdit}
                onDelete={onDelete}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

