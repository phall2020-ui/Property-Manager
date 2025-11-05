import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';

export interface ComplianceItem {
  id: string;
  propertyId: string;
  propertyAddress: string;
  type: string;
  status: 'OK' | 'DUE_SOON' | 'OVERDUE' | 'MISSING';
  dueDate: Date | null;
  expiryDate: Date | null;
  hasEvidence: boolean;
  documentId?: string;
  notes?: string;
}

@Injectable()
export class ComplianceService {
  constructor(private prisma: PrismaService) {}

  /**
   * Get all compliance items across all properties for a landlord
   */
  async getPortfolioCompliance(landlordId: string): Promise<ComplianceItem[]> {
    const properties = await this.prisma.property.findMany({
      where: { ownerOrgId: landlordId },
      include: {
        tenancies: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
        documents: true,
      },
    });

    const complianceItems: ComplianceItem[] = [];

    for (const property of properties) {
      const activeTenancy = property.tenancies[0];
      const propertyAddress = `${property.address1}${property.city ? ', ' + property.city : ''}`;

      // Gas Safety
      if (activeTenancy?.gasSafetyDueAt) {
        const gasDoc = property.documents.find(d => d.docType === 'GAS_SAFETY');
        complianceItems.push({
          id: `${property.id}-gas`,
          propertyId: property.id,
          propertyAddress,
          type: 'Gas Safety',
          dueDate: activeTenancy.gasSafetyDueAt,
          expiryDate: activeTenancy.gasSafetyDueAt,
          status: this.calculateStatus(activeTenancy.gasSafetyDueAt),
          hasEvidence: !!gasDoc,
          documentId: gasDoc?.id,
        });
      }

      // EICR
      if (activeTenancy?.eicrDueAt) {
        const eicrDoc = property.documents.find(d => d.docType === 'EICR');
        complianceItems.push({
          id: `${property.id}-eicr`,
          propertyId: property.id,
          propertyAddress,
          type: 'EICR',
          dueDate: activeTenancy.eicrDueAt,
          expiryDate: activeTenancy.eicrDueAt,
          status: this.calculateStatus(activeTenancy.eicrDueAt),
          hasEvidence: !!eicrDoc,
          documentId: eicrDoc?.id,
        });
      }

      // EPC
      if (activeTenancy?.epcExpiresAt) {
        const epcDoc = property.documents.find(d => d.docType === 'EPC');
        complianceItems.push({
          id: `${property.id}-epc`,
          propertyId: property.id,
          propertyAddress,
          type: 'EPC',
          dueDate: activeTenancy.epcExpiresAt,
          expiryDate: activeTenancy.epcExpiresAt,
          status: this.calculateStatus(activeTenancy.epcExpiresAt),
          hasEvidence: !!epcDoc,
          documentId: epcDoc?.id,
        });
      }

      // Boiler Service
      if (activeTenancy?.boilerServiceDueAt) {
        const boilerDoc = property.documents.find(d => d.docType === 'BOILER_SERVICE');
        complianceItems.push({
          id: `${property.id}-boiler`,
          propertyId: property.id,
          propertyAddress,
          type: 'Boiler Service',
          dueDate: activeTenancy.boilerServiceDueAt,
          expiryDate: activeTenancy.boilerServiceDueAt,
          status: this.calculateStatus(activeTenancy.boilerServiceDueAt),
          hasEvidence: !!boilerDoc,
          documentId: boilerDoc?.id,
        });
      }

      // Smoke Alarms
      if (activeTenancy?.smokeAlarmsCheckedAt) {
        complianceItems.push({
          id: `${property.id}-smoke`,
          propertyId: property.id,
          propertyAddress,
          type: 'Smoke Alarms',
          dueDate: activeTenancy.smokeAlarmsCheckedAt,
          expiryDate: activeTenancy.smokeAlarmsCheckedAt,
          status: this.calculateStatus(activeTenancy.smokeAlarmsCheckedAt),
          hasEvidence: false,
        });
      }

      // CO Alarms
      if (activeTenancy?.coAlarmsCheckedAt) {
        complianceItems.push({
          id: `${property.id}-co`,
          propertyId: property.id,
          propertyAddress,
          type: 'CO Alarms',
          dueDate: activeTenancy.coAlarmsCheckedAt,
          expiryDate: activeTenancy.coAlarmsCheckedAt,
          status: this.calculateStatus(activeTenancy.coAlarmsCheckedAt),
          hasEvidence: false,
        });
      }

      // HMO Licence
      if (activeTenancy?.hmo && activeTenancy?.hmoLicenceExpiresAt) {
        const hmoDoc = property.documents.find(d => d.docType === 'HMO_LICENCE');
        complianceItems.push({
          id: `${property.id}-hmo`,
          propertyId: property.id,
          propertyAddress,
          type: 'HMO Licence',
          dueDate: activeTenancy.hmoLicenceExpiresAt,
          expiryDate: activeTenancy.hmoLicenceExpiresAt,
          status: this.calculateStatus(activeTenancy.hmoLicenceExpiresAt),
          hasEvidence: !!hmoDoc,
          documentId: hmoDoc?.id,
        });
      }

      // Deposit Protection
      if (activeTenancy?.depositProtectedAt) {
        complianceItems.push({
          id: `${property.id}-deposit`,
          propertyId: property.id,
          propertyAddress,
          type: 'Deposit Protection',
          dueDate: activeTenancy.depositProtectedAt,
          expiryDate: null,
          status: 'OK',
          hasEvidence: !!activeTenancy.depositScheme,
        });
      }

      // How to Rent Guide
      if (activeTenancy?.howToRentServedAt) {
        complianceItems.push({
          id: `${property.id}-htr`,
          propertyId: property.id,
          propertyAddress,
          type: 'How to Rent',
          dueDate: activeTenancy.howToRentServedAt,
          expiryDate: null,
          status: 'OK',
          hasEvidence: true,
        });
      }

      // Right to Rent
      if (activeTenancy?.rightToRentCheckedAt) {
        complianceItems.push({
          id: `${property.id}-rtr`,
          propertyId: property.id,
          propertyAddress,
          type: 'Right to Rent',
          dueDate: activeTenancy.rightToRentCheckedAt,
          expiryDate: null,
          status: 'OK',
          hasEvidence: true,
        });
      }

      // Legionella
      if (activeTenancy?.legionellaAssessmentAt) {
        const legionellaDoc = property.documents.find(d => d.docType === 'LEGIONELLA');
        complianceItems.push({
          id: `${property.id}-legionella`,
          propertyId: property.id,
          propertyAddress,
          type: 'Legionella',
          dueDate: activeTenancy.legionellaAssessmentAt,
          expiryDate: activeTenancy.legionellaAssessmentAt,
          status: this.calculateStatus(activeTenancy.legionellaAssessmentAt),
          hasEvidence: !!legionellaDoc,
          documentId: legionellaDoc?.id,
        });
      }
    }

    return complianceItems;
  }

  /**
   * Get compliance items for a specific property
   */
  async getPropertyCompliance(propertyId: string): Promise<ComplianceItem[]> {
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: {
        tenancies: {
          where: { status: 'ACTIVE' },
          orderBy: { startDate: 'desc' },
          take: 1,
        },
        documents: true,
      },
    });

    if (!property) {
      return [];
    }

    const complianceItems: ComplianceItem[] = [];
    const activeTenancy = property.tenancies[0];
    const propertyAddress = `${property.address1}${property.city ? ', ' + property.city : ''}`;

    // Define all compliance types
    const complianceTypes = [
      { field: 'gasSafetyDueAt', type: 'Gas Safety', docType: 'GAS_SAFETY' },
      { field: 'eicrDueAt', type: 'EICR', docType: 'EICR' },
      { field: 'epcExpiresAt', type: 'EPC', docType: 'EPC' },
      { field: 'boilerServiceDueAt', type: 'Boiler Service', docType: 'BOILER_SERVICE' },
      { field: 'smokeAlarmsCheckedAt', type: 'Smoke Alarms', docType: null },
      { field: 'coAlarmsCheckedAt', type: 'CO Alarms', docType: null },
      { field: 'legionellaAssessmentAt', type: 'Legionella', docType: 'LEGIONELLA' },
    ];

    for (const compliance of complianceTypes) {
      const dueDate = activeTenancy?.[compliance.field] as Date | undefined;
      const doc = compliance.docType ? property.documents.find(d => d.docType === compliance.docType) : null;
      
      complianceItems.push({
        id: `${property.id}-${compliance.type.toLowerCase().replace(/\s+/g, '-')}`,
        propertyId: property.id,
        propertyAddress,
        type: compliance.type,
        dueDate: dueDate || null,
        expiryDate: dueDate || null,
        status: dueDate ? this.calculateStatus(dueDate) : 'MISSING',
        hasEvidence: !!doc,
        documentId: doc?.id,
      });
    }

    // Add special compliance items
    if (activeTenancy) {
      // Deposit Protection
      complianceItems.push({
        id: `${property.id}-deposit`,
        propertyId: property.id,
        propertyAddress,
        type: 'Deposit Protection',
        dueDate: activeTenancy.depositProtectedAt,
        expiryDate: null,
        status: activeTenancy.depositProtectedAt ? 'OK' : 'MISSING',
        hasEvidence: !!activeTenancy.depositScheme,
      });

      // How to Rent Guide
      complianceItems.push({
        id: `${property.id}-htr`,
        propertyId: property.id,
        propertyAddress,
        type: 'How to Rent',
        dueDate: activeTenancy.howToRentServedAt,
        expiryDate: null,
        status: activeTenancy.howToRentServedAt ? 'OK' : 'MISSING',
        hasEvidence: !!activeTenancy.howToRentServedAt,
      });

      // Right to Rent
      complianceItems.push({
        id: `${property.id}-rtr`,
        propertyId: property.id,
        propertyAddress,
        type: 'Right to Rent',
        dueDate: activeTenancy.rightToRentCheckedAt,
        expiryDate: null,
        status: activeTenancy.rightToRentCheckedAt ? 'OK' : 'MISSING',
        hasEvidence: !!activeTenancy.rightToRentCheckedAt,
      });

      // HMO Licence (if applicable)
      if (activeTenancy.hmo) {
        const hmoDoc = property.documents.find(d => d.docType === 'HMO_LICENCE');
        complianceItems.push({
          id: `${property.id}-hmo`,
          propertyId: property.id,
          propertyAddress,
          type: 'HMO Licence',
          dueDate: activeTenancy.hmoLicenceExpiresAt,
          expiryDate: activeTenancy.hmoLicenceExpiresAt,
          status: activeTenancy.hmoLicenceExpiresAt ? this.calculateStatus(activeTenancy.hmoLicenceExpiresAt) : 'MISSING',
          hasEvidence: !!hmoDoc,
          documentId: hmoDoc?.id,
        });
      }
    }

    return complianceItems;
  }

  /**
   * Calculate compliance status based on due date
   */
  private calculateStatus(dueDate: Date): 'OK' | 'DUE_SOON' | 'OVERDUE' | 'MISSING' {
    if (!dueDate) return 'MISSING';

    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = Math.floor((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'OVERDUE';
    if (diffDays <= 30) return 'DUE_SOON';
    return 'OK';
  }

  /**
   * Get compliance statistics for dashboard
   */
  async getComplianceStats(landlordId: string) {
    const items = await this.getPortfolioCompliance(landlordId);

    return {
      overdue: items.filter(i => i.status === 'OVERDUE').length,
      dueSoon: items.filter(i => i.status === 'DUE_SOON').length,
      ok: items.filter(i => i.status === 'OK').length,
      missing: items.filter(i => i.status === 'MISSING').length,
      total: items.length,
    };
  }
}
