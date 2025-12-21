import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async findAll(tenantId: string) {
    return this.prisma.task.findMany({
      where: { tenantId },
      include: { assignee: true, riskItem: true },
      orderBy: { createdAt: 'desc' },
    });
  }
}
