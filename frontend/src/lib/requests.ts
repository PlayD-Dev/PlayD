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
  title: string;
  artist: string;
  requesterName: string;
  message?: string;
  paidAmount?: number | null;
  submittedAt: string;
  status: RequestStatus;
  priorityScore?: number | null;
  bpm?: number | null;
  key?: string | null;
}
