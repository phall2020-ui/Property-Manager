import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class TenanciesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: { propertyId: string; startDate: string; endDate?: string; rentAmount: string; depositScheme?: string; landlordId: string; }) {
    // Verify property belongs to landlord
    const property = await this.prisma.property.findUnique({ where: { id: data.propertyId } });
    if (!property || property.landlordId !== data.landlordId) {
      throw new ForbiddenException('Invalid property');
    }
    return this.prisma.tenancy.create({
      data: {
        propertyId: data.propertyId,
        startDate: new Date(data.startDate),
        endDate: data.endDate ? new Date(data.endDate) : undefined,
        rentAmount: parseFloat(data.rentAmount),
        depositScheme: data.depositScheme,
      },
    });
  }

  async findOne(id: string, landlordId: string) {
    const tenancy = await this.prisma.tenancy.findUnique({
      where: { id },
      include: { property: true },
    });
    if (!tenancy || tenancy.property.landlordId !== landlordId) {
      throw new NotFoundException();
    }
    return tenancy;
  }

  async attachDocument(tenancyId: string, documentId: string, landlordId: string) {
    // Ensure tenancy belongs to landlord
    const tenancy = await this.prisma.tenancy.findUnique({
      where: { id: tenancyId },
      include: { property: true },
    });
    if (!tenancy || tenancy.property.landlordId !== landlordId) {
      throw new ForbiddenException('Invalid tenancy');
    }
    // Document owner updated? We'll just ensure existence
    const doc = await this.prisma.document.findUnique({ where: { id: documentId } });
    if (!doc) throw new NotFoundException('Document not found');
    // In a more advanced implementation we might create a link table. Here we rely on ownerType/ownerId.
    return doc;
  }
}