import { redirect } from "next/navigation";

export default function BillingPage() {
  // Billing is disabled for now.
  redirect("/app/workspace-settings");
}

