import { Injectable } from '@nestjs/common';
import { SongRequest } from './requests.model';
import { v4 as uuid } from 'uuid';

@Injectable()
export class RequestsService {

    private songQueue: SongRequest[] = [];

    createRequest(info: Partial<SongRequest>){
        
        //initialization of song request
        const request: SongRequest = {
            id: uuid(),
            name: info.name!,
            artist: info.artist!,
            requesterName: info.requesterName!,
            message: info.message,
            boost: info.boost ?? 0,
            requestTime: Date.now(),
            status: "pending" 
        };

        this.songQueue.push(request);
        return request;

    }

    getSongQueue(){
        return this.songQueue

        //filter for songs that are still pending, exluding ones that have been played/skipped
        .filter(songRequest => songRequest.status === "pending")

        //sorting of songs by boost, then request time if boost is equal
        .sort((song1, song2) => {

            if (song2.boost !== song1.boost){
                return song2.boost - song1.boost;
            }

            return song1.requestTime - song2.requestTime;
        });
    }

    //Updates the status of a certain song request
    updateStatus(id: string, status: SongRequest["status"]){

        //find song request by unique id
        const request = this.songQueue.find(songRequest => songRequest.id === id);

        if (!request){
            return null;
        }

        request.status = status;
        return request;
    }

}
