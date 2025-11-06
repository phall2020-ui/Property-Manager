import { Controller, Get, Post, Body, Query, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { NotificationsService } from './notifications.service';
import { MarkReadDto } from './dto/mark-read.dto';

@ApiTags('notifications')
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'Get notifications for current user' })
  @ApiBearerAuth()
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'unreadOnly', required: false, type: Boolean })
  async getNotifications(
    @CurrentUser() user: any,
    @Query('limit') limit?: string,
    @Query('unreadOnly') unreadOnly?: string,
  ) {
    const parsedLimit = limit ? parseInt(limit, 10) : 50;
    const onlyUnread = unreadOnly === 'true';

    return this.notificationsService.findByUser(user.sub, parsedLimit, onlyUnread);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiBearerAuth()
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationsService.getUnreadCount(user.sub);
    return { count };
  }

  @Post('read')
  @ApiOperation({ summary: 'Mark notifications as read' })
  @ApiBearerAuth()
  async markAsRead(@CurrentUser() user: any, @Body() dto: MarkReadDto) {
    await this.notificationsService.markAsRead(user.sub, dto.ids);
    return { success: true };
  }

  @Post('read-all')
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiBearerAuth()
  async markAllAsRead(@CurrentUser() user: any) {
    await this.notificationsService.markAllAsRead(user.sub);
    return { success: true };
  }
}
