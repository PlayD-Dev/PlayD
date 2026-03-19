export type RequestStatus = "pending" | "received" | "played" | "skipped";

export interface SongRequest {
    id: string;     //unique id for song request
    name: string;       //name of the song
    artist: string;     //artist of the song
    requesterName: string;     //name of the song requester
    message?: string;       //optional message from the song requester
    boost: number;      //boost amount (higher Boost = higher priority in queue)
    requestTime: number;       //timestamp for when the song request was made 
    status: RequestStatus;      //current status of the song request
}