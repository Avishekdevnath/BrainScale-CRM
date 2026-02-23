"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export function EmailSettingsTestClient() {
  const currentUserEmail = useAuthStore((state) => state.user?.email || "");
  const [to, setTo] = React.useState("");
  const [subject, setSubject] = React.useState("BrainScale SMTP Test");
  const [message, setMessage] = React.useState(
    "This is a test email sent from BrainScale CRM UI."
  );
  const [isSending, setIsSending] = React.useState(false);
  const [result, setResult] = React.useState<{
    to: string;
    subject: string;
    sentAt: string;
  } | null>(null);

  React.useEffect(() => {
    if (!to && currentUserEmail) {
      setTo(currentUserEmail);
    }
  }, [currentUserEmail, to]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedTo = to.trim();
    if (!normalizedTo) {
      toast.error("Recipient email is required");
      return;
    }

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(normalizedTo)) {
      toast.error("Enter a valid recipient email");
      return;
    }

    try {
      setIsSending(true);
      setResult(null);
      const response = await apiClient.sendTestEmail({
        to: normalizedTo,
        subject,
        message,
      });

      setResult({
        to: response.to,
        subject: response.subject,
        sentAt: response.sentAt,
      });
      toast.success("Test email sent");
    } catch (error: unknown) {
      const message =
        error instanceof Error && error.message
          ? error.message
          : "Failed to send test email";
      toast.error(message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--groups1-text)] mb-2">Email Settings</h1>
        <p className="text-sm text-[var(--groups1-text-secondary)]">
          Send a test email using your configured SMTP provider.
        </p>
      </div>

      <Card variant="groups1" className="max-w-2xl">
        <CardHeader>
          <CardTitle>SMTP Test Sender</CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to">To</Label>
              <Input
                id="to"
                type="email"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                placeholder="recipient@example.com"
                disabled={isSending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input
                id="subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Test subject"
                disabled={isSending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={5}
                placeholder="Type your test message"
                disabled={isSending}
              />
            </div>

            <Button type="submit" disabled={isSending}>
              {isSending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Send Test Email
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>

      {result ? (
        <div className="max-w-2xl rounded-lg border border-[var(--groups1-border)] bg-[var(--groups1-surface)] p-4 text-sm text-[var(--groups1-text)]">
          <p className="font-medium">Email sent successfully</p>
          <p className="mt-1 text-[var(--groups1-text-secondary)]">To: {result.to}</p>
          <p className="text-[var(--groups1-text-secondary)]">Subject: {result.subject}</p>
          <p className="text-[var(--groups1-text-secondary)]">Sent at: {new Date(result.sentAt).toLocaleString()}</p>
        </div>
      ) : null}
    </div>
  );
}
