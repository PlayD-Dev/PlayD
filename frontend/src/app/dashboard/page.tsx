import { Dashboard } from "@/components/dashboard/Dashboard";
import { mockSongRequests } from "@/lib/mock-data";

export default function Page() {
  return <Dashboard initialRequests={mockSongRequests} />;
}