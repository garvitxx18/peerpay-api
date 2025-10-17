import { Global, Module } from '@nestjs/common';
import { AppLogger } from './app-logger.service';
import { LoggingInterceptor } from './logging.interceptor';

@Global()
@Module({
  providers: [AppLogger, LoggingInterceptor],
  exports: [AppLogger, LoggingInterceptor],
})
export class CommonModule {}
