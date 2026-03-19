import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { RequestsModule } from './requests/requests.module';

@Module({
  imports: [RequestsModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
