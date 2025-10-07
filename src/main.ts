import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // ✅ Validaciones globales
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  // ✅ Configuración de CORS
  app.enableCors({
    origin: [
      'http://localhost:5173',        // Frontend local Vite
      // agrega aquí otros orígenes permitidos, ej. dominio en prod:
      // 'https://portalcorp.tomza.com'
    ],
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: false,                // pon true si vas a usar cookies
    optionsSuccessStatus: 204,
  });

  const PORT = process.env.PORT || 3001;
  await app.listen(PORT);
  console.log(`✅ Auth API corriendo en http://localhost:${PORT}`);
}
bootstrap();
