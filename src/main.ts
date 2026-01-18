import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import CustomZodValidationPipe from './shared/pipes/custom-zod-validation.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new CustomZodValidationPipe());
  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
