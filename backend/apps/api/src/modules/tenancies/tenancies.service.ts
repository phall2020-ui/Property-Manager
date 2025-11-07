import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  computeTenancyStatus,
  validateTenancyDates,
  canRenewTenancy,
  TenancyStatus,
} from './tenancy-status.util';
import { UpdateTenancyDto } from './dto/update-tenancy.dto';
import { TerminateTenancyDto } from './dto/terminate-tenancy.dto';
import { RenewTenancyDto } from './dto/renew-tenancy.dto';
import { RentIncreaseDto } from './dto/rent-increase.dto';
import { CreateGuarantorDto } from './dto/create-guarantor.dto';

@Injectable()
export class TenanciesService {
  private readonly logger = new Logger(TenanciesService.name);

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

    // Validate dates
    const dateValidation = validateTenancyDates(data.startDate, data.endDate);
    if (!dateValidation.valid) {
      throw new BadRequestException(dateValidation.error);
    }

    // Compute initial status
    const status = computeTenancyStatus({
      start: data.startDate,
      end: data.endDate,
    });

    return this.prisma.tenancy.create({
      data: {
        propertyId: data.propertyId,
        tenantOrgId: data.tenantOrgId,
        start: data.startDate,
        startDate: data.startDate,
        end: data.endDate,
        endDate: data.endDate,
        rent: data.rentPcm,
        rentPcm: data.rentPcm,
        frequency: 'MONTHLY',
        deposit: data.deposit,
        status,
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
        breakClause: true,
        guarantors: true,
        rentRevisions: {
          orderBy: { effectiveFrom: 'desc' },
        },
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

  async update(id: string, dto: UpdateTenancyDto, userOrgIds: string[], userId: string) {
    // Verify access
    const tenancy = await this.findOne(id, userOrgIds);

    // Only landlords can update
    if (!userOrgIds.includes(tenancy.property.ownerOrgId)) {
      throw new ForbiddenException('Only landlords can update tenancies');
    }

    // Build update data
    const updateData: any = {};

    if (dto.startDate) {
      updateData.start = new Date(dto.startDate);
      updateData.startDate = new Date(dto.startDate);
    }

    if (dto.endDate !== undefined) {
      updateData.end = dto.endDate ? new Date(dto.endDate) : null;
      updateData.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    if (dto.deposit !== undefined) {
      updateData.deposit = dto.deposit;
    }

    if (dto.primaryTenant !== undefined) {
      updateData.primaryTenant = dto.primaryTenant;
    }

    // Validate dates if changed
    const newStart = updateData.start || tenancy.start;
    const newEnd = updateData.end !== undefined ? updateData.end : tenancy.end;

    const dateValidation = validateTenancyDates(newStart, newEnd);
    if (!dateValidation.valid) {
      throw new BadRequestException(dateValidation.error);
    }

    // Check for overlap with renewed tenancy
    if (dto.startDate || dto.endDate !== undefined) {
      const renewedTenancy = await this.prisma.tenancy.findFirst({
        where: { renewalOfId: id },
      });

      if (renewedTenancy && newEnd) {
        const renewedStart = renewedTenancy.start;
        if (newEnd > renewedStart) {
          const renewedStartDate = renewedStart.toISOString().split('T')[0];
          const newEndDate = newEnd.toISOString().split('T')[0];
          throw new ConflictException(
            `New end date (${newEndDate}) would overlap with renewed tenancy starting on ${renewedStartDate}`,
          );
        }
      }
    }

    // Update status if dates changed
    if (dto.startDate || dto.endDate !== undefined) {
      updateData.status = computeTenancyStatus({
        start: newStart,
        end: newEnd,
        terminatedAt: tenancy.terminatedAt,
      });
    }

    // Handle rent change - create rent revision
    let rentRevisionCreated = false;
    if (dto.rentPcm !== undefined && dto.rentPcm !== tenancy.rentPcm) {
      await this.prisma.rentRevision.create({
        data: {
          tenancyId: id,
          effectiveFrom: new Date(),
          rentPcm: dto.rentPcm,
          reason: 'Manual update',
        },
      });
      updateData.rent = dto.rentPcm;
      updateData.rentPcm = dto.rentPcm;
      rentRevisionCreated = true;
    }

    // Handle break clause
    if (dto.breakClause) {
      await this.prisma.breakClause.upsert({
        where: { tenancyId: id },
        create: {
          tenancyId: id,
          earliestBreakDate: new Date(dto.breakClause.earliestBreakDate),
          noticeMonths: dto.breakClause.noticeMonths,
          notes: dto.breakClause.notes,
        },
        update: {
          earliestBreakDate: new Date(dto.breakClause.earliestBreakDate),
          noticeMonths: dto.breakClause.noticeMonths,
          notes: dto.breakClause.notes,
        },
      });
    }

    // Update tenancy
    const updated = await this.prisma.tenancy.update({
      where: { id },
      data: updateData,
      include: {
        property: true,
        tenantOrg: true,
        breakClause: true,
        guarantors: true,
        rentRevisions: {
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });

    // Create audit log
    await this.createAuditLog({
      tenancyId: id,
      actorId: userId,
      action: 'UPDATE',
      entity: 'Tenancy',
      entityId: id,
      meta: JSON.stringify({
        changes: dto,
        rentRevisionCreated,
      }),
    });

    return updated;
  }

  async terminate(
    id: string,
    dto: TerminateTenancyDto,
    userOrgIds: string[],
    userId: string,
  ) {
    // Verify access
    const tenancy = await this.findOne(id, userOrgIds);

    // Only landlords can terminate
    if (!userOrgIds.includes(tenancy.property.ownerOrgId)) {
      throw new ForbiddenException('Only landlords can terminate tenancies');
    }

    // Check if already terminated or ended
    if (
      tenancy.status === TenancyStatus.TERMINATED ||
      tenancy.status === TenancyStatus.ENDED
    ) {
      throw new ConflictException('Tenancy is already terminated or ended');
    }

    const terminatedAt = dto.terminatedAt ? new Date(dto.terminatedAt) : new Date();

    // Check break clause
    if (tenancy.breakClause) {
      const earliestBreak = new Date(tenancy.breakClause.earliestBreakDate);
      if (terminatedAt < earliestBreak) {
        const earliestBreakFormatted = earliestBreak.toISOString().split('T')[0];
        const terminatedAtFormatted = terminatedAt.toISOString().split('T')[0];
        throw new ConflictException(
          `Cannot terminate on ${terminatedAtFormatted} as it is before the earliest break date of ${earliestBreakFormatted}. The break clause requires ${tenancy.breakClause.noticeMonths} months notice.`,
        );
      }
    }

    // Update tenancy
    const updated = await this.prisma.tenancy.update({
      where: { id },
      data: {
        status: TenancyStatus.TERMINATED,
        terminatedAt,
        terminationReason: dto.reason,
      },
      include: {
        property: true,
        tenantOrg: true,
        breakClause: true,
      },
    });

    // Create audit log
    await this.createAuditLog({
      tenancyId: id,
      actorId: userId,
      action: 'TERMINATE',
      entity: 'Tenancy',
      entityId: id,
      meta: JSON.stringify({
        reason: dto.reason,
        terminatedAt,
      }),
    });

    return updated;
  }

  async renew(id: string, dto: RenewTenancyDto, userOrgIds: string[], userId: string) {
    // Verify access
    const oldTenancy = await this.findOne(id, userOrgIds);

    // Only landlords can renew
    if (!userOrgIds.includes(oldTenancy.property.ownerOrgId)) {
      throw new ForbiddenException('Only landlords can renew tenancies');
    }

    // Check if tenancy can be renewed
    const renewCheck = canRenewTenancy(oldTenancy.status, oldTenancy.end);
    if (!renewCheck.can) {
      throw new ConflictException(renewCheck.reason);
    }

    // Validate new dates
    const newStart = new Date(dto.startDate);
    const newEnd = new Date(dto.endDate);

    const dateValidation = validateTenancyDates(newStart, newEnd);
    if (!dateValidation.valid) {
      throw new BadRequestException(dateValidation.error);
    }

    // Validate adjacency with old tenancy
    if (oldTenancy.end) {
      const oldEnd = new Date(oldTenancy.end);
      const dayAfterOldEnd = new Date(oldEnd);
      dayAfterOldEnd.setDate(dayAfterOldEnd.getDate() + 1);

      if (newStart < oldEnd) {
        throw new BadRequestException(
          'New tenancy start date must be on or after old tenancy end date',
        );
      }
    }

    // Use transaction to create new and update old atomically
    const result = await this.prisma.$transaction(async (tx) => {
      // Create new tenancy
      const newTenancy = await tx.tenancy.create({
        data: {
          propertyId: oldTenancy.propertyId,
          tenantOrgId: oldTenancy.tenantOrgId,
          landlordId: oldTenancy.landlordId,
          primaryTenant: dto.primaryTenant || oldTenancy.primaryTenant,
          start: newStart,
          startDate: newStart,
          end: newEnd,
          endDate: newEnd,
          rent: dto.rentPcm,
          rentPcm: dto.rentPcm,
          frequency: 'MONTHLY',
          deposit: dto.deposit ?? oldTenancy.deposit,
          status: computeTenancyStatus({ start: newStart, end: newEnd }),
          renewalOfId: id,
        },
        include: {
          property: true,
          tenantOrg: true,
        },
      });

      // Copy guarantors if requested
      if (dto.copyGuarantors && oldTenancy.guarantors?.length > 0) {
        await Promise.all(
          oldTenancy.guarantors.map((guarantor) =>
            tx.guarantor.create({
              data: {
                tenancyId: newTenancy.id,
                name: guarantor.name,
                email: guarantor.email,
                phone: guarantor.phone,
                notes: guarantor.notes,
              },
            }),
          ),
        );
      }

      // Update old tenancy status if needed
      if (oldTenancy.end && new Date(oldTenancy.end) < new Date()) {
        await tx.tenancy.update({
          where: { id },
          data: { status: TenancyStatus.ENDED },
        });
      }

      return newTenancy;
    });

    // Create audit logs
    await this.createAuditLog({
      tenancyId: result.id,
      actorId: userId,
      action: 'CREATE',
      entity: 'Tenancy',
      entityId: result.id,
      meta: JSON.stringify({
        renewalOf: id,
        copyGuarantors: dto.copyGuarantors,
      }),
    });

    await this.createAuditLog({
      tenancyId: id,
      actorId: userId,
      action: 'RENEW',
      entity: 'Tenancy',
      entityId: id,
      meta: JSON.stringify({
        renewedBy: result.id,
      }),
    });

    return result;
  }

  async applyRentIncrease(
    id: string,
    dto: RentIncreaseDto,
    userOrgIds: string[],
    userId: string,
  ) {
    // Verify access
    const tenancy = await this.findOne(id, userOrgIds);

    // Only landlords can apply rent increases
    if (!userOrgIds.includes(tenancy.property.ownerOrgId)) {
      throw new ForbiddenException('Only landlords can apply rent increases');
    }

    const effectiveFrom = new Date(dto.effectiveFrom);

    // Create rent revision
    await this.prisma.rentRevision.create({
      data: {
        tenancyId: id,
        effectiveFrom,
        rentPcm: dto.newRentPcm,
        reason: dto.reason || 'Rent increase',
      },
    });

    // Update current rent if effective date is today or earlier
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const updateData: any = {};
    if (effectiveFrom <= today) {
      updateData.rent = dto.newRentPcm;
      updateData.rentPcm = dto.newRentPcm;
    }

    const updated = await this.prisma.tenancy.update({
      where: { id },
      data: updateData,
      include: {
        property: true,
        tenantOrg: true,
        rentRevisions: {
          orderBy: { effectiveFrom: 'desc' },
        },
      },
    });

    // Create audit log
    await this.createAuditLog({
      tenancyId: id,
      actorId: userId,
      action: 'RENT_INCREASE',
      entity: 'Tenancy',
      entityId: id,
      meta: JSON.stringify({
        effectiveFrom: dto.effectiveFrom,
        newRentPcm: dto.newRentPcm,
        reason: dto.reason,
      }),
    });

    return updated;
  }

  async addGuarantor(
    tenancyId: string,
    dto: CreateGuarantorDto,
    userOrgIds: string[],
    userId: string,
  ) {
    // Verify access
    const tenancy = await this.findOne(tenancyId, userOrgIds);

    // Only landlords can add guarantors
    if (!userOrgIds.includes(tenancy.property.ownerOrgId)) {
      throw new ForbiddenException('Only landlords can add guarantors');
    }

    const guarantor = await this.prisma.guarantor.create({
      data: {
        tenancyId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
        notes: dto.notes,
      },
    });

    // Create audit log
    await this.createAuditLog({
      tenancyId,
      actorId: userId,
      action: 'ADD_GUARANTOR',
      entity: 'Guarantor',
      entityId: guarantor.id,
      meta: JSON.stringify({ name: dto.name, email: dto.email }),
    });

    return guarantor;
  }

  async removeGuarantor(
    guarantorId: string,
    userOrgIds: string[],
    userId: string,
  ) {
    // Find guarantor with tenancy
    const guarantor = await this.prisma.guarantor.findUnique({
      where: { id: guarantorId },
      include: {
        tenancy: {
          include: {
            property: true,
          },
        },
      },
    });

    if (!guarantor) {
      throw new NotFoundException('Guarantor not found');
    }

    // Only landlords can remove guarantors
    if (!userOrgIds.includes(guarantor.tenancy.property.ownerOrgId)) {
      throw new ForbiddenException('Only landlords can remove guarantors');
    }

    await this.prisma.guarantor.delete({
      where: { id: guarantorId },
    });

    // Create audit log
    await this.createAuditLog({
      tenancyId: guarantor.tenancyId,
      actorId: userId,
      action: 'REMOVE_GUARANTOR',
      entity: 'Guarantor',
      entityId: guarantorId,
      meta: JSON.stringify({ name: guarantor.name }),
    });

    return { success: true };
  }

  async getPayments(id: string, userOrgIds: string[]) {
    // Verify access
    await this.findOne(id, userOrgIds);

    // Mock payment data (to be replaced with actual finance module integration)
    return [
      {
        id: 'p1',
        dueDate: '2025-12-01',
        amount: '1200.00',
        status: 'PAID',
        receivedAt: '2025-12-02',
      },
      {
        id: 'p2',
        dueDate: '2026-01-01',
        amount: '1200.00',
        status: 'PENDING',
        receivedAt: null,
      },
    ];
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

  private async createAuditLog(data: {
    tenancyId: string;
    actorId: string;
    action: string;
    entity: string;
    entityId: string;
    meta?: string;
  }) {
    try {
      await this.prisma.auditLog.create({
        data: {
          tenancyId: data.tenancyId,
          actorId: data.actorId,
          action: data.action,
          entity: data.entity,
          entityId: data.entityId,
          meta: data.meta,
        },
      });
    } catch (error) {
      // Log but don't fail the operation if audit log fails
      this.logger.error('Failed to create audit log', error);
    }
  }
}
