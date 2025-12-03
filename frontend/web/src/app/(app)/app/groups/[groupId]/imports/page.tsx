"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BulkImportModal } from "@/components/students/BulkImportModal";
import { Upload, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function GroupImportsPage() {
  const routeParams = useParams();
  const router = useRouter();
  const groupId = routeParams?.groupId as string;
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  usePageTitle("Import Students");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Import Students</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Import students directly into this group from CSV data
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Quick Import */}
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>Bulk Import Students</CardTitle>
          </CardHeader>
          <CardContent variant="groups1" className="space-y-4 pb-6">
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              Import multiple students at once by pasting CSV data. All imported students will be automatically enrolled in this group.
            </p>
            <ul className="text-xs text-[var(--groups1-text-secondary)] space-y-1 list-disc list-inside">
              <li>Supports simple and advanced mapping formats</li>
              <li>Automatic group enrollment</li>
              <li>Real-time validation and preview</li>
              <li>Up to 2000 rows per import</li>
            </ul>
            <Button
              onClick={() => setIsImportModalOpen(true)}
              className="w-full bg-[var(--groups1-primary)] text-[var(--groups1-btn-primary-text)] hover:bg-[var(--groups1-primary-hover)]"
            >
              <Upload className="w-4 h-4 mr-2" />
              Open Import Modal
            </Button>
          </CardContent>
        </Card>

        {/* Navigate to Students */}
        <Card variant="groups1">
          <CardHeader variant="groups1">
            <CardTitle>View Students</CardTitle>
          </CardHeader>
          <CardContent variant="groups1" className="space-y-4 pb-6">
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              View all students in this group, manage enrollments, and access advanced features.
            </p>
            <Button
              onClick={() => router.push(`/app/groups/${groupId}/students`)}
              className="w-full border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              <Users className="w-4 h-4 mr-2" />
              Go to Students Page
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Import Instructions */}
      <Card variant="groups1">
        <CardHeader variant="groups1">
          <CardTitle>Import Instructions</CardTitle>
        </CardHeader>
        <CardContent variant="groups1" className="space-y-3 pb-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[var(--groups1-text)]">CSV Format:</h3>
            <div className="text-xs text-[var(--groups1-text-secondary)] space-y-1 font-mono bg-[var(--groups1-secondary)] p-3 rounded">
              <div>Full Name,Email,Phone,Tags</div>
              <div>John Doe,john@example.com,1234567890,tag1, tag2</div>
              <div>Jane Smith,jane@example.com,0987654321,tag3</div>
            </div>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[var(--groups1-text)]">Required Fields:</h3>
            <ul className="text-xs text-[var(--groups1-text-secondary)] space-y-1 list-disc list-inside">
              <li><strong>Name:</strong> Student full name (required)</li>
              <li><strong>Email:</strong> Email address (optional, must be unique if provided)</li>
              <li><strong>Phone:</strong> Phone number (optional)</li>
              <li><strong>Tags:</strong> Comma-separated tags (optional)</li>
            </ul>
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-[var(--groups1-text)]">Advanced Features:</h3>
            <ul className="text-xs text-[var(--groups1-text-secondary)] space-y-1 list-disc list-inside">
              <li>Multiple phone numbers per student</li>
              <li>Enrollment data (course, status) from CSV</li>
              <li>Automatic duplicate detection</li>
              <li>Real-time validation feedback</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      {/* Import Modal */}
      <BulkImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        groupId={groupId}
        onSuccess={() => {
          setIsImportModalOpen(false);
          toast.success("Students imported successfully!");
          // Optionally redirect to students page
          setTimeout(() => {
            router.push(`/app/groups/${groupId}/students`);
          }, 1500);
        }}
      />
    </div>
  );
}

