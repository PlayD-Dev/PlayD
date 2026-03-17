import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestStatus, SongRequest } from './requests.model';

@Controller('requests')
export class RequestsController {

    constructor(private readonly requestsService: RequestsService){}

        @Post()
        create(@Body() body) {
            return this.requestsService.createRequest(body);
        }

        @Get()
        getQueue() {
            return this.requestsService.getSongQueue();
        }

        @Patch(':id/:status')
        updateStatus(@Param('id') id: string, @Param('status') status: string){
            return this.requestsService.updateStatus(id, status as SongRequest["status"]);
        }
}
