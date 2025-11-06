import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { CreateFeatureFlagDto, UpdateFeatureFlagDto } from '../dto/flags.dto';
import { createHash } from 'crypto';

@Injectable()
export class FlagsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all feature flags for a landlord
   */
  async getFlags(landlordId: string) {
    return this.prisma.featureFlag.findMany({
      where: { landlordId },
      orderBy: { key: 'asc' },
    });
  }

  /**
   * Get a specific feature flag
   */
  async getFlag(landlordId: string, key: string) {
    return this.prisma.featureFlag.findUnique({
      where: {
        landlordId_key: { landlordId, key },
      },
    });
  }

  /**
   * Check if a feature is enabled
   */
  async isEnabled(landlordId: string, key: string): Promise<boolean> {
    const flag = await this.getFlag(landlordId, key);
    return flag?.enabled || false;
  }

  /**
   * Create a feature flag
   */
  async createFlag(landlordId: string, dto: CreateFeatureFlagDto) {
    return this.prisma.featureFlag.create({
      data: {
        landlordId,
        ...dto,
      },
    });
  }

  /**
   * Update a feature flag
   */
  async updateFlag(landlordId: string, key: string, dto: UpdateFeatureFlagDto) {
    return this.prisma.featureFlag.update({
      where: {
        landlordId_key: { landlordId, key },
      },
      data: dto,
    });
  }

  /**
   * Create or update a feature flag (upsert)
   */
  async upsertFlag(landlordId: string, dto: CreateFeatureFlagDto) {
    return this.prisma.featureFlag.upsert({
      where: {
        landlordId_key: { landlordId, key: dto.key },
      },
      create: {
        landlordId,
        ...dto,
      },
      update: {
        enabled: dto.enabled,
        variant: dto.variant,
      },
    });
  }

  /**
   * Toggle a feature flag
   */
  async toggleFlag(landlordId: string, key: string) {
    const flag = await this.getFlag(landlordId, key);
    
    if (!flag) {
      throw new NotFoundException('Feature flag not found');
    }

    return this.prisma.featureFlag.update({
      where: {
        landlordId_key: { landlordId, key },
      },
      data: {
        enabled: !flag.enabled,
      },
    });
  }

  /**
   * Assign landlord to experiment variant
   */
  async assignExperiment(
    landlordId: string,
    experimentKey: string,
    variant?: string,
  ) {
    // If no variant specified, use consistent hashing to assign
    if (!variant) {
      variant = this.hashToVariant(landlordId, experimentKey);
    }

    return this.prisma.experimentAssignment.upsert({
      where: {
        landlordId_experimentKey: { landlordId, experimentKey },
      },
      create: {
        landlordId,
        experimentKey,
        variant,
      },
      update: {
        variant,
      },
    });
  }

  /**
   * Get experiment assignment for landlord
   */
  async getExperimentAssignment(landlordId: string, experimentKey: string) {
    return this.prisma.experimentAssignment.findUnique({
      where: {
        landlordId_experimentKey: { landlordId, experimentKey },
      },
    });
  }

  /**
   * Get all experiment assignments for landlord
   */
  async getExperimentAssignments(landlordId: string) {
    return this.prisma.experimentAssignment.findMany({
      where: { landlordId },
    });
  }

  /**
   * Hash landlordId + experimentKey to consistently assign variant
   */
  private hashToVariant(landlordId: string, experimentKey: string): string {
    const hash = createHash('sha256')
      .update(`${landlordId}:${experimentKey}`)
      .digest('hex');
    
    // Use first 8 characters of hash to determine variant
    const hashValue = parseInt(hash.substring(0, 8), 16);
    const mod = hashValue % 100;
    
    // 50/50 split between control and variant_a
    if (mod < 50) {
      return 'control';
    } else {
      return 'variant_a';
    }
  }

  /**
   * Create an upsell opportunity
   */
  async createUpsellOpportunity(
    landlordId: string,
    type: string,
    status: string,
    notes?: string,
  ) {
    return this.prisma.upsellOpportunity.create({
      data: {
        landlordId,
        type,
        status,
        notes,
      },
    });
  }

  /**
   * Get upsell opportunities for landlord
   */
  async getUpsellOpportunities(landlordId: string, status?: string) {
    return this.prisma.upsellOpportunity.findMany({
      where: {
        landlordId,
        ...(status ? { status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Update upsell opportunity
   */
  async updateUpsellOpportunity(
    id: string,
    landlordId: string,
    data: { status?: string; notes?: string },
  ) {
    const opportunity = await this.prisma.upsellOpportunity.findFirst({
      where: { id, landlordId },
    });

    if (!opportunity) {
      throw new NotFoundException('Upsell opportunity not found');
    }

    return this.prisma.upsellOpportunity.update({
      where: { id },
      data,
    });
  }
}
