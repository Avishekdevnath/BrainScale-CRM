"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BulkImportModal } from "@/components/students/BulkImportModal";
import { Upload, Users, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from "@/hooks/usePageTitle";

export default function ImportsPage() {
  const router = useRouter();
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  usePageTitle("Import Students");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Import Students</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Import students from CSV data or navigate to the Students page for more options
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
              Import multiple students at once by pasting CSV data. Supports both simple and advanced mapping formats.
            </p>
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
            <CardTitle>Students Management</CardTitle>
          </CardHeader>
          <CardContent variant="groups1" className="space-y-4 pb-6">
            <p className="text-sm text-[var(--groups1-text-secondary)]">
              View all students, manage imports, exports, and access advanced features on the Students page.
            </p>
            <Button
              onClick={() => router.push("/app/students")}
              className="w-full border bg-[var(--groups1-surface)] border-[var(--groups1-border)] text-[var(--groups1-text)] hover:bg-[var(--groups1-secondary)]"
            >
              <Users className="w-4 h-4 mr-2" />
              Go to Students Page
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Import Modal */}
      <BulkImportModal
        open={isImportModalOpen}
        onOpenChange={setIsImportModalOpen}
        onSuccess={() => {
          setIsImportModalOpen(false);
          toast.success("Students imported successfully!");
          // Optionally redirect to students page
          setTimeout(() => {
            router.push("/app/students");
          }, 1500);
        }}
      />
    </div>
  );
}
