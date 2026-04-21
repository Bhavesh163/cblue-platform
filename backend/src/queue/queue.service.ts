import { Injectable, Inject, Logger, OnModuleInit } from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { RABBITMQ_CLIENT } from './queue.module';

@Injectable()
export class QueueService implements OnModuleInit {
  private readonly logger = new Logger(QueueService.name);

  constructor(@Inject(RABBITMQ_CLIENT) private readonly client: ClientProxy) {}

  async onModuleInit() {
    try {
      this.client.connect().then(() => {
        this.logger.log('Connected to RabbitMQ');
      }).catch(err => {
        this.logger.warn('RabbitMQ not available — falling back to EventEmitter');
      });
    } catch {
      this.logger.warn('RabbitMQ not available — falling back to EventEmitter');
    }
  }

  emit(pattern: string, data: unknown): void {
    try {
      this.client.emit(pattern, data);
      this.logger.debug(`Event emitted: ${pattern}`);
    } catch {
      this.logger.warn(`Failed to emit ${pattern} to RabbitMQ`);
    }
  }
}
