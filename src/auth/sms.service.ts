import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SmsService {
  private readonly log = new Logger(SmsService.name);
  async send(phone: string, message: string) {
    // Plug an SMS provider later (Exotel/Twilio/MSG91)
    this.log.log(`SMS to ${phone} => ${message}`);
  }
}
