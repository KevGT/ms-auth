import { Module } from '@nestjs/common';
import { MailService } from './mail.service';

@Module({
  providers: [MailService],
  exports: [MailService],          // <-- exporta el servicio
})
export class MailModule {}
