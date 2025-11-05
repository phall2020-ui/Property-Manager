import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PropertiesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { address1: string; address2?: string; city?: string; postcode: string; bedrooms?: number; ownerOrgId: string; }) {
    return this.prisma.property.create({ data });
  }

  async findOne(id: string, ownerOrgId: string) {
    const property = await this.prisma.property.findUnique({ where: { id } });
    if (!property || property.ownerOrgId !== ownerOrgId) {
      throw new NotFoundException();
    }
    return property;
  }

  async findMany(ownerOrgId: string, page = 1, limit = 20) {
    return this.prisma.property.findMany({
      where: { ownerOrgId },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    });
  }
}