import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from '../app.module';
import { QualificationStorageReadinessService } from '../modules/qualification/qualification-storage-readiness.service';

async function run(): Promise<void> {
  let app: INestApplicationContext | undefined;
  let failed = false;

  try {
    app = await NestFactory.createApplicationContext(AppModule, {
      logger: false,
    });
    const readiness = app.get(QualificationStorageReadinessService);
    const state = await readiness.probe();

    if (!state.ready) {
      failed = true;
      console.error('Qualification storage probe failed: ' + state.code);
    }
  } catch {
    failed = true;
    console.error('Qualification storage probe could not complete');
  } finally {
    if (app) {
      try {
        await app.close();
      } catch {
        failed = true;
        console.error('Qualification storage probe could not close cleanly');
      }
    }
    if (failed) {
      process.exitCode = 1;
    }
  }
}

void run();
