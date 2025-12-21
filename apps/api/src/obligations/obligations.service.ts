import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateObligationDto, UpdateObligationDto } from '@complianceos/shared';

@Injectable()
export class ObligationsService {
  constructor(private prisma: PrismaService) {}

  async create(tenantId: string, dto: CreateObligationDto) {
    const data: any = { ...dto, tenantId };
    return this.prisma.obligation.create({ data });
  }

  async findAll(tenantId: string) {
    return this.prisma.obligation.findMany({
      where: { tenantId, isActive: true },
      include: {
        owner: { select: { id: true, firstName: true, lastName: true } },
        template: true,
        controls: { include: { control: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(tenantId: string, id: string) {
    return this.prisma.obligation.findFirst({
      where: { id, tenantId },
      include: {
        owner: true,
        template: true,
        controls: { include: { control: true } },
        artifacts: { include: { artifact: true } },
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateObligationDto) {
    return this.prisma.obligation.update({
      where: { id },
      data: dto,
    });
  }
}
