import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateMandateDto } from '../dto/create-mandate.dto';

@Injectable()
export class MandateService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Create a mandate (returns mock link in MVP)
   */
  async createMandate(landlordId: string, dto: CreateMandateDto) {
    // Verify tenant exists
    const tenant = await this.prisma.user.findUnique({
      where: { id: dto.tenantUserId },
    });

    if (!tenant) {
      throw new NotFoundException('Tenant user not found');
    }

    // Create mandate
    const mandate = await this.prisma.mandate.create({
      data: {
        landlordId,
        tenantUserId: dto.tenantUserId,
        provider: dto.provider,
        status: 'PENDING',
        reference: `MOCK-${dto.provider}-${Date.now()}`,
      },
    });

    // In mock mode, return a fake authorization URL
    const mockAuthUrl = `https://mock-${dto.provider.toLowerCase()}.com/authorize?mandate=${mandate.id}`;

    return {
      mandate,
      authorizationUrl: mockAuthUrl,
      message: 'Mock mandate created. In production, this would redirect to provider.',
    };
  }

  /**
   * Get mandate by ID
   */
  async getMandate(mandateId: string, landlordId: string) {
    const mandate = await this.prisma.mandate.findFirst({
      where: {
        id: mandateId,
        landlordId,
      },
      include: {
        tenantUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!mandate) {
      throw new NotFoundException('Mandate not found');
    }

    return mandate;
  }

  /**
   * List mandates for landlord
   */
  async listMandates(
    landlordId: string,
    filters: {
      tenantUserId?: string;
      status?: string;
      page?: number;
      limit?: number;
    } = {},
  ) {
    const { tenantUserId, status, page = 1, limit = 50 } = filters;

    const where: any = { landlordId };
    if (tenantUserId) where.tenantUserId = tenantUserId;
    if (status) where.status = status;

    const [mandates, total] = await Promise.all([
      this.prisma.mandate.findMany({
        where,
        include: {
          tenantUser: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.mandate.count({ where }),
    ]);

    return {
      data: mandates,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Update mandate status (typically called by webhook)
   */
  async updateMandateStatus(mandateId: string, status: string, reference?: string) {
    const updateData: any = { status };
    
    if (status === 'ACTIVE' && !reference) {
      updateData.activatedAt = new Date();
    }
    
    if (reference) {
      updateData.reference = reference;
    }

    return this.prisma.mandate.update({
      where: { id: mandateId },
      data: updateData,
    });
  }

  /**
   * Get mandate by tenant user ID
   */
  async getMandateByTenant(tenantUserId: string, landlordId: string) {
    return this.prisma.mandate.findFirst({
      where: {
        tenantUserId,
        landlordId,
        status: 'ACTIVE',
      },
      orderBy: {
        activatedAt: 'desc',
      },
    });
  }
}
