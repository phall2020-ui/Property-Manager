import {
  Controller,
  Get,
  Param,
  Request,
} from '@nestjs/common';
import { ComplianceService } from './compliance.service';

@Controller('compliance')
export class ComplianceController {
  constructor(private readonly complianceService: ComplianceService) {}

  @Get('portfolio')
  async getPortfolioCompliance(@Request() req) {
    const landlordId = req.user.orgs[0].orgId;
    return this.complianceService.getPortfolioCompliance(landlordId);
  }

  @Get('portfolio/stats')
  async getComplianceStats(@Request() req) {
    const landlordId = req.user.orgs[0].orgId;
    return this.complianceService.getComplianceStats(landlordId);
  }

  @Get('property/:propertyId')
  async getPropertyCompliance(@Param('propertyId') propertyId: string) {
    return this.complianceService.getPropertyCompliance(propertyId);
  }
}
