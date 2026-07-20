import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  BlueBridgeService,
  resolvePersistedFixerWorkflowSnapshot,
} from './blue-bridge.service';
import { FixerWorkflowActionDto } from './dto/fixer-workflow-action.dto';

type FixerWorkflowActionKey =
  | 'partner-accept'
  | 'partner-decline'
  | 'fee-proceed'
  | 'free-pass'
  | 'send-meeting-invitation'
  | 'confirm-meeting'
  | 'send-variation'
  | 'skip-variation'
  | 'confirm-variation'
  | 'send-completion'
  | 'confirm-completion'
  | 'rate-partner'
  | 'rate-customer'
  | 'customer-cancel';

const SUPPORTED_ACTIONS = new Set<FixerWorkflowActionKey>([
  'partner-accept',
  'partner-decline',
  'fee-proceed',
  'free-pass',
  'send-meeting-invitation',
  'confirm-meeting',
  'send-variation',
  'skip-variation',
  'confirm-variation',
  'send-completion',
  'confirm-completion',
  'rate-partner',
  'rate-customer',
  'customer-cancel',
]);

interface Transition {
  status: OrderStatus;
  workflowPhase: string;
}

@Injectable()
export class FixerWorkflowBridgeService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly bridge: BlueBridgeService,
  ) {}

  async action(
    poNumber: string,
    userId: string,
    action: string,
    dto: FixerWorkflowActionDto,
    headerIdempotencyKey?: string,
  ) {
    const key = String(action || '').trim() as FixerWorkflowActionKey;
    if (!SUPPORTED_ACTIONS.has(key)) {
      throw new BadRequestException('Unsupported workflow action');
    }

    const idempotencyKey = String(
      headerIdempotencyKey || dto.idempotencyKey || '',
    ).trim();
    let orderId: string | null = null;

    try {
      await this.prisma.$transaction(async (tx) => {
        const order = await this.findOrder(tx, poNumber);
        if (!order) throw new NotFoundException('Workflow detail not found');
        orderId = order.id;

        if (idempotencyKey) {
          const existing = await tx.fixerWorkflowAction.findUnique({
            where: {
              orderId_idempotencyKey: {
                orderId: order.id,
                idempotencyKey,
              },
            },
            select: { id: true, action: true },
          });
          if (existing) {
            if (existing.action !== key) {
              throw new ConflictException(
                'Idempotency key was already used for a different action',
              );
            }
            return;
          }
        }

        const workflowVersion = Number(order.workflowRevision || 0);
        if (
          dto.workflowVersion !== undefined &&
          Number(dto.workflowVersion) !== workflowVersion
        ) {
          throw new ConflictException('Workflow version is stale');
        }

        const completedActionKeys = order.workflowActions.map(
          (event) => event.action,
        );
        const snapshot = resolvePersistedFixerWorkflowSnapshot({
          poNumber,
          status: order.status,
          workflowPhase: order.workflowPhase,
          workflowVersion,
          customerUserId: order.userId,
          fixerUserId: order.fixer?.userId,
          viewerUserIds: [userId],
          completedActionKeys,
        });
        const allowedAction = snapshot.actions.find(
          (candidate) => candidate.key === key,
        );
        if (!allowedAction) {
          throw new ForbiddenException(
            'This action is not available to the authenticated participant',
          );
        }

        this.assertActionInput(key, dto);
        const transition = this.transition(key, completedActionKeys);

        await tx.fixerWorkflowAction.create({
          data: {
            orderId: order.id,
            actorUserId: userId,
            action: key,
            idempotencyKey: idempotencyKey || null,
            workflowRevision: workflowVersion + 1,
            payload: this.payload(dto),
          },
        });

        const update = await tx.order.updateMany({
          where: { id: order.id, workflowRevision: workflowVersion },
          data: {
            status: transition.status,
            workflowPhase: transition.workflowPhase,
            ...(key === 'fee-proceed' || key === 'free-pass'
              ? { chatEnabled: true }
              : key === 'confirm-completion'
                ? { chatEnabled: false }
              : {}),
            workflowRevision: { increment: 1 },
            ...(key === 'send-meeting-invitation'
              ? {
                  meetingDate: dto.meetingDate?.trim() || null,
                  meetingTime: dto.meetingTime?.trim() || null,
                  meetingVenue: dto.meetingVenue?.trim() || null,
                  meetingNote: dto.note?.trim() || null,
                }
              : {}),
          },
        });
        if (update.count !== 1) {
          throw new ConflictException('Workflow changed; refresh and retry');
        }

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            status: transition.status,
            changedBy: userId,
            note: `Bridge workflow action: ${key}`,
          },
        });

        if (key === 'rate-partner') {
          await tx.review.create({
            data: {
              orderId: order.id,
              userId,
              fixerId: order.fixerId,
              rating: Number(dto.rating),
              comment: dto.note || null,
            },
          });
        }
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002' &&
        idempotencyKey
      ) {
        // A concurrent retry won the unique idempotency race. Its persisted
        // snapshot is the canonical result for this request.
      } else {
        throw error;
      }
    }

    if (orderId) {
      return this.bridge.authenticatedWorkflowDetailsByOrderId(
        orderId,
        poNumber,
        userId,
      );
    }
    return this.bridge.authenticatedWorkflowDetails(poNumber, userId);
  }

  private async findOrder(tx: any, poNumber: string) {
    return tx.order.findFirst({
      where: {
        description: { contains: poNumber, mode: 'insensitive' },
      },
      include: {
        fixer: { select: { userId: true } },
        review: { select: { createdAt: true } },
        workflowActions: {
          select: { action: true },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private assertActionInput(
    action: FixerWorkflowActionKey,
    dto: FixerWorkflowActionDto,
  ): void {
    if (
      action === 'fee-proceed' &&
      dto.feeMode !== undefined &&
      dto.feeMode !== 'payment'
    ) {
      throw new BadRequestException('fee-proceed requires payment feeMode');
    }
    if (
      action === 'free-pass' &&
      dto.feeMode !== undefined &&
      dto.feeMode !== 'free-pass'
    ) {
      throw new BadRequestException('free-pass requires free-pass feeMode');
    }
    if (action === 'send-meeting-invitation') {
      if (!dto.meetingDate || !dto.meetingTime || !dto.meetingVenue) {
        throw new BadRequestException(
          'Meeting date, time, and venue are required',
        );
      }
    }
    if (
      action === 'send-variation' &&
      (!Array.isArray(dto.variationItems) || dto.variationItems.length === 0)
    ) {
      throw new BadRequestException(
        'send-variation requires at least one structured variation item',
      );
    }
    if (
      ['rate-partner', 'rate-customer'].includes(action) &&
      (!Number.isInteger(dto.rating) ||
        Number(dto.rating) < 1 ||
        Number(dto.rating) > 5)
    ) {
      throw new BadRequestException('A rating from 1 to 5 is required');
    }
  }

  private transition(
    action: FixerWorkflowActionKey,
    completedActionKeys: string[],
  ): Transition {
    switch (action) {
      case 'partner-accept':
        return { status: OrderStatus.CONFIRMED, workflowPhase: 'FEE' };
      case 'partner-decline':
      case 'customer-cancel':
        return { status: OrderStatus.CANCELLED, workflowPhase: 'TERMINAL' };
      case 'fee-proceed':
      case 'free-pass':
        return { status: OrderStatus.IN_PROGRESS, workflowPhase: 'CHAT' };
      case 'send-meeting-invitation':
        return {
          status: OrderStatus.MEETING_REQUESTED,
          workflowPhase: 'MEETING_CONFIRM',
        };
      case 'confirm-meeting':
        return { status: OrderStatus.IN_PROGRESS, workflowPhase: 'VARIATION' };
      case 'send-variation':
        return {
          status: OrderStatus.IN_PROGRESS,
          workflowPhase: 'VARIATION_CONFIRM',
        };
      case 'skip-variation':
      case 'confirm-variation':
        return { status: OrderStatus.IN_PROGRESS, workflowPhase: 'COMPLETION' };
      case 'send-completion':
        return {
          status: OrderStatus.IN_PROGRESS,
          workflowPhase: 'COMPLETION_CONFIRM',
        };
      case 'confirm-completion':
        return { status: OrderStatus.COMPLETED, workflowPhase: 'RATING' };
      case 'rate-partner':
        return {
          status: OrderStatus.COMPLETED,
          workflowPhase: completedActionKeys.includes('rate-customer')
            ? 'TERMINAL'
            : 'RATING',
        };
      case 'rate-customer':
        return {
          status: OrderStatus.COMPLETED,
          workflowPhase: completedActionKeys.includes('rate-partner')
            ? 'TERMINAL'
            : 'RATING',
        };
    }
  }

  private payload(dto: FixerWorkflowActionDto): Prisma.InputJsonValue {
    return {
      note: dto.note || null,
      rating: dto.rating || null,
      feeMode: dto.feeMode || null,
      meetingDate: dto.meetingDate || null,
      meetingTime: dto.meetingTime || null,
      meetingVenue: dto.meetingVenue || null,
      variationItems:
        dto.variationItems?.map((item) => ({
          service: item.service,
          quantity: item.quantity,
          unit: item.unit,
          unitRate: item.unitRate,
          total:
            Math.round(Number(item.quantity) * Number(item.unitRate) * 100) / 100,
        })) || null,
    };
  }
}
