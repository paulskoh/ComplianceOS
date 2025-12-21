import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRiskItemDto, UpdateRiskItemDto } from '@complianceos/shared';

@Injectable()
export class RisksService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateRiskItemDto) {
    const data: any = { ...dto, tenantId };
    return this.prisma.riskItem.create({
      data,
      include: { obligation: true, control: true, owner: true },
    });
  }

  async findAll(tenantId: string) {
    return this.prisma.riskItem.findMany({
      where: { tenantId },
      include: { obligation: true, control: true, owner: true },
      orderBy: [{ severity: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async update(tenantId: string, id: string, dto: UpdateRiskItemDto) {
    return this.prisma.riskItem.update({
      where: { id },
      data: dto,
      include: { obligation: true, control: true, owner: true },
    });
  }
}
