import { Dashboard } from "@/components/dashboard/Dashboard";

// Seeded event ID — replace with DJ auth session once auth is wired
const EVENT_ID = "e1000000-0000-0000-0000-000000000001";

export default function Page() {
  return <Dashboard eventId={EVENT_ID} />;
}
