import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { Pool } from 'pg';
import { QualificationRoutingService } from '../src/modules/qualification/qualification-routing.service';

const testDatabaseUrl = process.env.TEST_DATABASE_URL;
const describeWithPostgres = testDatabaseUrl ? describe : describe.skip;

describeWithPostgres('Qualification routing PostgreSQL concurrency', () => {
  let pool: Pool;
  let prisma: PrismaClient;
  let routing: QualificationRoutingService;
  let userId: string;
  let submissionId: string;

  beforeAll(async () => {
    pool = new Pool({
      connectionString: testDatabaseUrl,
      max: 6,
    });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    await prisma.$connect();
    routing = new QualificationRoutingService(prisma as any);

    const nonce = randomUUID();
    userId = randomUUID();
    const fixerId = randomUUID();
    submissionId = randomUUID();
    await prisma.user.create({
      data: {
        id: userId,
        email: `qualification-routing-${nonce}@example.test`,
        name: 'Routing Concurrency Test',
      },
    });
    await prisma.fixer.create({
      data: {
        id: fixerId,
        userId,
      },
    });
    await prisma.kycSubmission.create({
      data: {
        id: submissionId,
        fixerId,
        version: 1,
        status: 'DRAFT',
        policyVersion: 'kyc-routing-integration-v1',
      },
    });

    const documents = [
      ['id-front', `front-${nonce}`],
      ['id-back', `back-${nonce}`],
      ['selfie-with-id', `selfie-${nonce}`],
    ] as const;
    for (const [documentType, checksumSha256] of documents) {
      await prisma.kycDocument.create({
        data: {
          submissionId,
          documentType,
          storageKey: `qualification/integration/${nonce}/${documentType}`,
          checksumSha256,
          contentType: 'image/jpeg',
          sizeBytes: 4,
          isActive: true,
          lifecycleState: 'READY',
          readyAt: new Date(),
          assessedAt: new Date(),
          assessmentReasonCodes: ['DOCUMENT_VALID'],
        },
      });
      await prisma.qualificationEvaluation.create({
        data: {
          submissionId,
          provider: 'INTEGRATION_TEST',
          policyVersion: 'kyc-routing-integration-v1',
          status: 'COMPLETED',
          confidence: 80,
          humanReviewRequired: true,
          inputHash: checksumSha256,
          completedAt: new Date(),
        },
      });
    }
  });

  afterAll(async () => {
    if (prisma && userId) {
      await prisma.user.deleteMany({ where: { id: userId } });
      await prisma.$disconnect();
    }
    if (pool) {
      await pool.end();
    }
  });

  it('serializes concurrent routing and enforces one unresolved KYC task', async () => {
    const indexes = await prisma.$queryRaw<
      Array<{ indexdef: string }>
    >`SELECT indexdef
      FROM pg_indexes
      WHERE schemaname = current_schema()
        AND indexname = 'qualification_review_tasks_one_unresolved_kyc'`;
    expect(indexes).toHaveLength(1);
    expect(indexes[0].indexdef).toContain(`WHERE (("kind" = 'KYC'`);
    expect(indexes[0].indexdef).toContain(`("status" <> 'DECIDED'`);

    const [first, second] = await Promise.all([
      routing.routeSubmission(submissionId, userId),
      routing.routeSubmission(submissionId, userId),
    ]);

    expect(first.status).toBe('NEEDS_REVIEW');
    expect(second.status).toBe('NEEDS_REVIEW');
    await expect(
      prisma.qualificationReviewTask.create({
        data: {
          submissionId,
          kind: 'KYC',
          status: 'OPEN',
          reasonCodes: ['HUMAN_REVIEW_REQUIRED'],
        },
      }),
    ).rejects.toMatchObject({ code: 'P2002' });

    await expect(
      prisma.qualificationReviewTask.count({
        where: {
          submissionId,
          kind: 'KYC',
          status: { not: 'DECIDED' },
        },
      }),
    ).resolves.toBe(1);
    await expect(
      prisma.qualificationAuditLog.count({
        where: {
          submissionId,
          action: 'QUALIFICATION_ROUTED',
        },
      }),
    ).resolves.toBe(1);
  });
});
