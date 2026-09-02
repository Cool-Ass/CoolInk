import { redirect } from "next/navigation";

// Preserve existing deep links while keeping the client information
// architecture centred on the Projects / Submissions view.
export default function LegacyVisitsPage() {
  redirect("/app/portal/projects");
}
