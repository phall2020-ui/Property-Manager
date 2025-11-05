import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Roles } from '../../common/decorators/roles.decorator';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Roles('OPS')
  @Post('email')
  @ApiOperation({ summary: 'Send an email notification (internal)' })
  @ApiBearerAuth()
  async sendEmail(@Body('userId') userId: string, @Body('subject') subject: string, @Body('body') body: string) {
    await this.notificationsService.sendEmail(userId, subject, body);
    return { success: true };
  }

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiBearerAuth()
  async list(@CurrentUser() user: any) {
    return this.notificationsService.getUserNotifications(user.id);
  }
}