import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  });

  // Swagger Setup
  const config = new DocumentBuilder()
    .setTitle('VeloVeni API')
    .setDescription('API für VeloVeni - kompetitive Radfahr-App')
    .setVersion('1.0')
    .addTag('auth')
    .addTag('users')
    .addTag('activities')
    .addTag('territories')
    .addTag('leaderboard')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3000}`);
  console.log(`Swagger UI: http://localhost:${process.env.PORT ?? 3000}/api`);
}
bootstrap();
