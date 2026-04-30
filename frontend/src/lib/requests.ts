/* Supported lifecycle states for a song request in the dashboard. */
export type RequestStatus =
  | "pending"
  | "seen"
  | "played"
  | "skipped"
  | "saved"
  | "cancelled";

/** Frontend shape for each request shown in the dashboard. */
export interface DashboardRequest {
  id: string;
  /** All request IDs merged into this entry (same song, same event). */
  requestIds: string[];
  spotifyId: string;
  title: string;
  artist: string;
  requesterName: string;
  /** Total number of unique guests who requested this song. */
  requestCount: number;
  message?: string;
  paidAmount?: number | null;
  submittedAt: string;
  status: RequestStatus;
  priorityScore?: number | null;
  bpm?: number | null;
  key?: string | null;
}
