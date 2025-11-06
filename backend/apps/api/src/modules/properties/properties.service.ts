import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: { addressLine1: string; address2?: string; city: string; postcode: string; bedrooms?: number; councilTaxBand?: string; ownerOrgId: string; }) {
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

  async update(
    id: string,
    ownerOrgId: string,
    data: {
      addressLine1?: string;
      address2?: string;
      city?: string;
      postcode?: string;
      bedrooms?: number;
      councilTaxBand?: string;
      attributes?: {
        propertyType?: string;
        furnished?: string;
        epcRating?: string;
        propertyValue?: number;
      };
    },
  ) {
    // Verify ownership first
    const existing = await this.prisma.property.findUnique({
      where: { id },
      select: { id: true, ownerOrgId: true },
    });

    if (!existing || existing.ownerOrgId !== ownerOrgId) {
      this.logger.warn(`Property update denied: id=${id}, ownerOrgId=${ownerOrgId}`);
      throw new NotFoundException('Property not found');
    }

    // Normalize postcode if provided
    const updateData: any = { ...data };
    if (updateData.postcode) {
      updateData.postcode = updateData.postcode.trim().toUpperCase();
    }

    // Handle attributes separately
    if (updateData.attributes) {
      const { propertyType, furnished, epcRating, propertyValue } = updateData.attributes;
      delete updateData.attributes;
      
      if (propertyType !== undefined) updateData.propertyType = propertyType;
      if (furnished !== undefined) updateData.furnished = furnished;
      if (epcRating !== undefined) updateData.epcRating = epcRating;
      if (propertyValue !== undefined) updateData.propertyValue = propertyValue;
    }

    const updated = await this.prisma.property.update({
      where: { id },
      data: updateData,
    });

    this.logger.log({
      action: 'property.updated',
      propertyId: id,
      ownerOrgId,
      fields: Object.keys(data),
    });

    return updated;
  }
}