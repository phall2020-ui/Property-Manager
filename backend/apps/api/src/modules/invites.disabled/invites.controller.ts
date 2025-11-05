import { Body, Controller, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateInviteDto } from './dto/create-invite.dto';
import { AcceptInviteDto } from './dto/accept-invite.dto';
import { InvitesService } from './invites.service';
import { LandlordResourceGuard } from '../../common/guards/landlord-resource.guard';
import { UseGuards } from '@nestjs/common';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('invites')
@Controller('invites')
export class InvitesController {
  constructor(private readonly invitesService: InvitesService) {}

  @Roles('LANDLORD')
  @UseGuards(LandlordResourceGuard)
  @Post('tenant')
  @ApiOperation({ summary: 'Invite a tenant to a tenancy' })
  @ApiBearerAuth()
  async invite(@Body() dto: CreateInviteDto, @CurrentUser() user: any) {
    return this.invitesService.createInvite(user.landlordId, dto.tenancyId, dto.email);
  }

  @Public()
  @Post('tenant/accept')
  @ApiOperation({ summary: 'Accept a tenant invite' })
  async accept(@Body() dto: AcceptInviteDto) {
    return this.invitesService.acceptInvite(dto.token, dto.email, dto.password, dto.displayName);
  }
}