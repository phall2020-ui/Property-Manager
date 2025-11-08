import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class PropertiesService {
  private readonly logger = new Logger(PropertiesService.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(data: { addressLine1: string; address2?: string; city: string; postcode: string; bedrooms?: number; councilTaxBand?: string; ownerOrgId: string; }) {
    return this.prisma.property.create({ data });
  }

  async findOne(id: string, ownerOrgId: string) {
    const property = await this.prisma.property.findUnique({ 
      where: { id },
    });
    if (!property || property.ownerOrgId !== ownerOrgId || property.deletedAt) {
      throw new NotFoundException();
    }
    return property;
  }

  async findMany(
    ownerOrgId: string,
    options?: {
      page?: number;
      pageSize?: number;
      search?: string;
      type?: string;
      city?: string;
      postcode?: string;
      sort?: string;
      order?: string;
    },
  ) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 20;
    const skip = (page - 1) * pageSize;
    
    // Build where clause with filters
    const where: any = {
      ownerOrgId,
      deletedAt: null,
      AND: [],
    };

    // Add search filter
    if (options?.search) {
      where.AND.push({
        OR: [
          { addressLine1: { contains: options.search } },
          { city: { contains: options.search } },
          { postcode: { contains: options.search } },
        ],
      });
    }

    // Add specific filters
    if (options?.type) {
      where.AND.push({ propertyType: options.type });
    }
    if (options?.city) {
      where.AND.push({ city: { equals: options.city } });
    }
    if (options?.postcode) {
      where.AND.push({ postcode: { equals: options.postcode } });
    }

    // Remove AND if empty
    if (where.AND.length === 0) {
      delete where.AND;
    }

    // Determine sort order
    const orderBy: any = {};
    const sortField = options?.sort || 'updatedAt';
    const sortOrder = options?.order || 'desc';
    
    // Whitelist of allowed sort fields
    const allowedSortFields = ['updatedAt', 'createdAt', 'addressLine1', 'address1'];
    
    if (allowedSortFields.includes(sortField)) {
      if (sortField === 'address1' || sortField === 'addressLine1') {
        orderBy.addressLine1 = sortOrder;
      } else {
        orderBy[sortField] = sortOrder;
      }
    } else {
      // Default to updatedAt if invalid field provided
      orderBy.updatedAt = sortOrder;
    }

    // Execute query with count
    const [data, total] = await Promise.all([
      this.prisma.property.findMany({
        where,
        skip,
        take: pageSize,
        orderBy,
      }),
      this.prisma.property.count({ where }),
    ]);

    return {
      data,
      total,
      page,
      pageSize,
    };
  }

  /**
   * Get properties for a contractor (from tickets assigned to them)
   */
  async findPropertiesForContractor(contractorId: string) {
    // Get unique properties from tickets assigned to this contractor
    const tickets = await this.prisma.ticket.findMany({
      where: {
        assignedToId: contractorId,
        propertyId: { not: null },
      },
      select: {
        propertyId: true,
        property: {
          select: {
            id: true,
            addressLine1: true,
            address2: true,
            city: true,
            postcode: true,
            propertyType: true,
            bedrooms: true,
            ownerOrgId: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      distinct: ['propertyId'],
    });

    // Extract unique properties
    const properties = tickets
      .map(t => t.property)
      .filter((p): p is NonNullable<typeof p> => p !== null)
      .filter((p, index, self) => 
        index === self.findIndex(prop => prop.id === p.id)
      );

    return {
      data: properties,
      total: properties.length,
      page: 1,
      pageSize: properties.length,
    };
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
      select: { id: true, ownerOrgId: true, deletedAt: true },
    });

    if (!existing || existing.ownerOrgId !== ownerOrgId || existing.deletedAt) {
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

  async delete(
    id: string,
    ownerOrgId: string,
    options?: {
      force?: boolean;
      purgeImages?: boolean;
    },
  ) {
    // Verify ownership and that property exists
    const property = await this.prisma.property.findUnique({
      where: { id },
      include: {
        tenancies: {
          where: {
            status: { in: ['ACTIVE', 'SCHEDULED'] },
          },
        },
        images: true,
      },
    });

    if (!property || property.ownerOrgId !== ownerOrgId || property.deletedAt) {
      throw new NotFoundException('Property not found');
    }

    // Check for active/scheduled tenancies
    if (property.tenancies.length > 0 && !options?.force) {
      throw new ConflictException(
        'Cannot delete property with active or scheduled tenancies. Use force=true to override.',
      );
    }

    // Perform soft delete
    const deleted = await this.prisma.property.update({
      where: { id },
      data: { deletedAt: new Date() },
    });

    // Optionally purge images
    if (options?.purgeImages && property.images.length > 0) {
      await this.prisma.propertyImage.deleteMany({
        where: { propertyId: id },
      });
      this.logger.log(`Purged ${property.images.length} images for property ${id}`);
    }

    this.logger.log({
      action: 'property.deleted',
      propertyId: id,
      ownerOrgId,
      force: options?.force,
      purgeImages: options?.purgeImages,
    });

    return deleted;
  }

  async restore(id: string, ownerOrgId: string) {
    // Verify ownership and that property is soft-deleted
    const property = await this.prisma.property.findUnique({
      where: { id },
    });

    if (!property || property.ownerOrgId !== ownerOrgId) {
      throw new NotFoundException('Property not found');
    }

    if (!property.deletedAt) {
      throw new ConflictException('Property is not deleted');
    }

    // Restore the property
    const restored = await this.prisma.property.update({
      where: { id },
      data: { deletedAt: null },
    });

    this.logger.log({
      action: 'property.restored',
      propertyId: id,
      ownerOrgId,
    });

    return restored;
  }
}