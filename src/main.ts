import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security headers
  app.use(helmet({
    crossOriginEmbedderPolicy: false, // needed for Swagger UI
    contentSecurityPolicy: false,     // configure per environment in production
  }));

  app.enableCors({
    origin: true,
    credentials: true,
  });

  console.log(`FRONTEND_URL: ${process.env.FRONTEND_URL}`);

  const config = new DocumentBuilder()
    .setTitle('VeloVeni API')
    .setDescription('API für VeloVeni - kompetitive Radfahr-App')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  await app.listen(process.env.PORT ?? 3000);
  console.log(`Application is running on: http://localhost:${process.env.PORT ?? 3000}`);
}
bootstrap();
