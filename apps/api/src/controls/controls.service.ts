import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateControlDto, UpdateControlDto } from '@complianceos/shared';

@Injectable()
export class ControlsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateControlDto) {
    const { obligationIds, ...controlData } = dto;

    const data: any = {
      ...controlData,
      tenantId,
      obligations: obligationIds?.length ? {
        create: obligationIds.map((obligationId) => ({ obligationId })),
      } : undefined,
    };

    return this.prisma.control.create({
      data,
      include: {
        obligations: { include: { obligation: true } },
        owner: true,
      },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.control.findMany({
      where: { tenantId, isActive: true },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        obligations: { include: { obligation: true } },
        evidenceRequirements: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.control.findFirst({
      where: { id, tenantId },
      include: {
        owner: true,
        obligations: { include: { obligation: true } },
        evidenceRequirements: true,
        artifacts: { include: { artifact: true } },
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateControlDto) {
    const { obligationIds, ...data } = dto;

    if (obligationIds) {
      await this.prisma.controlObligation.deleteMany({
        where: { controlId: id },
      });
    }

    return this.prisma.control.update({
      where: { id },
      data: {
        ...data,
        ...(obligationIds && {
          obligations: {
            create: obligationIds.map((obligationId) => ({ obligationId })),
          },
        }),
      },
      include: {
        obligations: { include: { obligation: true } },
        owner: true,
      },
    });
  }
}
