"use client";

import * as React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiClient } from "@/lib/api-client";
import { useAuthStore } from "@/store/auth";
import { Loader2, Send, Mail, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

export function TestEmailCard() {
  const currentUserEmail = useAuthStore((state) => state.user?.email || "");
  const [isOpen, setIsOpen] = React.useState(false);
  const [to, setTo] = React.useState("");
  const [subject, setSubject] = React.useState("BrainScale Test Email");
  const [message, setMessage] = React.useState(
    "This is a test email from BrainScale CRM."
  );
  const [isSending, setIsSending] = React.useState(false);
  const [result, setResult] = React.useState<{
    to: string;
    subject: string;
    sentAt: string;
  } | null>(null);

  React.useEffect(() => {
    if (isOpen && !to && currentUserEmail) {
      setTo(currentUserEmail);
    }
  }, [isOpen, currentUserEmail, to]);

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
      toast.success("Test email sent successfully");
      // Close dialog after 2 seconds
      setTimeout(() => {
        setIsOpen(false);
        setResult(null);
        setTo(currentUserEmail);
        setSubject("BrainScale Test Email");
        setMessage("This is a test email from BrainScale CRM.");
      }, 2000);
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error && error.message
          ? error.message
          : "Failed to send test email";
      toast.error(errorMessage);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      <Card variant="groups1">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Test Email Sender
          </CardTitle>
        </CardHeader>
        <CardContent variant="groups1">
          <p className="text-sm text-[var(--groups1-text-secondary)] mb-4">
            Send test emails using your configured email provider with Resend.
          </p>
          <Button
            onClick={() => setIsOpen(true)}
            variant="default"
            size="sm"
            disabled={isSending}
          >
            <Send className="mr-2 h-4 w-4" />
            Send Test Email
          </Button>

          {result && (
            <div className="mt-4 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-900">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Email sent successfully</p>
                  <p className="text-xs mt-1">To: {result.to}</p>
                  <p className="text-xs">Subject: {result.subject}</p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Send Test Email</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSend} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="to">Recipient Email</Label>
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
                rows={4}
                placeholder="Type your test message"
                disabled={isSending}
              />
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSending}>
                {isSending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Send
                  </>
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
