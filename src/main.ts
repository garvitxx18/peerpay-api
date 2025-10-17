import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // Swagger configuration
  const config = new DocumentBuilder()
    .setTitle('PeerPay API')
    .setDescription('A peer-to-peer payment API with OTP-based authentication')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints for OTP-based login')
    .addTag('users', 'User profile management endpoints')
    .addTag('groups', 'Group management and expense tracking')
    .addTag('settlements', 'Payment settlements and UPI integration')
    .addTag('app', 'Application health and status endpoints')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'JWT',
        description: 'Enter JWT token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(3000);
  console.log('🚀 Application is running on: http://localhost:3000');
  console.log('📚 Swagger documentation available at: http://localhost:3000/api');
}
bootstrap();
