import { redirect } from "next/navigation";

export default function PricingPage() {
  // Pricing / billing is disabled for now.
  redirect("/signup");
}

