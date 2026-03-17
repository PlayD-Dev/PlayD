import { Module } from '@nestjs/common';
import { RequestsService } from './requests.service';
import { RequestsController } from './requests.controller';

@Module({
  providers: [RequestsService],
  controllers: [RequestsController]
})
export class RequestsModule {}
