import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    // PRISMA_QUERY_LOG=1 : trace chaque requête SQL et sa durée, pour auditer les routes lentes.
    const trace = process.env.PRISMA_QUERY_LOG === '1';
    super(trace ? { log: [{ emit: 'event', level: 'query' }] } : undefined);
    if (trace) {
      const journal = new Logger('SQL');
      (this as unknown as PrismaClient<Prisma.PrismaClientOptions, 'query'>).$on('query', (e) =>
        journal.log(`${e.duration} ms  ${e.query.replace(/\s+/g, ' ').slice(0, 160)}`),
      );
    }
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
