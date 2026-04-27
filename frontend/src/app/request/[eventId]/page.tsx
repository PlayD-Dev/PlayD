import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { RequestPage } from "@/components/request/RequestPage";

type Params = Promise<{ eventId: string }>;

// Shown when the DJ hasn't started the event yet
function EventNotStarted({ eventName }: { eventName: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#020202] px-6 text-center">
      <div className="text-5xl opacity-30">♪</div>
      <h1 className="text-2xl font-bold text-white">{eventName}</h1>
      <p className="text-[#7f8db2]">This event hasn&apos;t started yet.</p>
      <p className="text-sm text-zinc-600">Check back soon or ask your DJ.</p>
    </div>
  );
}

// Shown when the DJ has ended the event
function EventEnded({ eventName }: { eventName: string }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-[#020202] px-6 text-center">
      <div className="text-5xl opacity-30">♪</div>
      <h1 className="text-2xl font-bold text-white">{eventName}</h1>
      <p className="text-[#7f8db2]">This event has ended.</p>
      <p className="text-sm text-zinc-600">Thanks for being part of the crowd!</p>
    </div>
  );
}

export default async function RequestRoute({ params }: { params: Params }) {
  const { eventId } = await params;

  const { data: event } = await supabase
    .from("events")
    .select("id, name, status")
    .eq("id", eventId)
    .maybeSingle();

  if (!event) notFound();

  if (event.status === "draft") return <EventNotStarted eventName={event.name} />;
  if (event.status === "ended") return <EventEnded eventName={event.name} />;

  return <RequestPage eventId={event.id} eventName={event.name} />;
}
