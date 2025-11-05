import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class TenanciesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: {
    propertyId: string;
    tenantOrgId: string;
    startDate: Date;
    endDate?: Date;
    rentPcm: number;
    deposit: number;
    ownerOrgId: string;
  }) {
    // Verify property belongs to owner org
    const property = await this.prisma.property.findUnique({
      where: { id: data.propertyId },
    });

    if (!property || property.ownerOrgId !== data.ownerOrgId) {
      throw new ForbiddenException('Property not found or access denied');
    }

    return this.prisma.tenancy.create({
      data: {
        propertyId: data.propertyId,
        tenantOrgId: data.tenantOrgId,
        startDate: data.startDate,
        endDate: data.endDate,
        rentPcm: data.rentPcm,
        deposit: data.deposit,
        status: 'PENDING',
      },
      include: {
        property: true,
        tenantOrg: true,
      },
    });
  }

  async findOne(id: string, userOrgIds: string[]) {
    const tenancy = await this.prisma.tenancy.findUnique({
      where: { id },
      include: {
        property: true,
        tenantOrg: true,
        documents: true,
      },
    });

    if (!tenancy) {
      throw new NotFoundException('Tenancy not found');
    }

    // Check if user has access (either property owner or tenant)
    const hasAccess =
      userOrgIds.includes(tenancy.property.ownerOrgId) ||
      userOrgIds.includes(tenancy.tenantOrgId);

    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    return tenancy;
  }

  async findMany(userOrgIds: string[], role: string) {
    const where: any = {};

    if (role === 'LANDLORD') {
      // Show tenancies for properties owned by user's org
      where.property = {
        ownerOrgId: { in: userOrgIds },
      };
    } else if (role === 'TENANT') {
      // Show tenancies where user's org is the tenant
      where.tenantOrgId = { in: userOrgIds };
    }

    return this.prisma.tenancy.findMany({
      where,
      include: {
        property: true,
        tenantOrg: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async uploadDocument(
    tenancyId: string,
    filename: string,
    filepath: string,
    mimetype: string,
    size: number,
    userOrgIds: string[],
  ) {
    // Verify access to tenancy
    await this.findOne(tenancyId, userOrgIds);

    return this.prisma.tenancyDocument.create({
      data: {
        tenancyId,
        filename,
        filepath,
        mimetype,
        size,
      },
    });
  }
}
