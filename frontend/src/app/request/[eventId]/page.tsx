import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { RequestPage } from "@/components/request/RequestPage";

type Params = Promise<{ eventId: string }>;

export default async function RequestRoute({ params }: { params: Params }) {
  const { eventId } = await params;

  // Fetch event from Supabase to get the real name
  const { data: event } = await supabase
    .from("events")
    .select("id, name, status")
    .eq("id", eventId)
    .neq("status", "ended")
    .single();

  if (!event) notFound();

  return (
    <RequestPage
      eventId={event.id}
      eventName={event.name}
      userName="Guest"
    />
  );
}
