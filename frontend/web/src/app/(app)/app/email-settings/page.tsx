import type { Metadata } from "next";
import { EmailSettingsTestClient } from "./test-client";

export const metadata: Metadata = {
  title: "Email Settings | BrainScale CRM",
};

export default function EmailSettingsPage() {
  return <EmailSettingsTestClient />;
}

