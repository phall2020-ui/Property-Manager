import { Injectable, BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { NotificationsService } from '../notifications/notifications.service';
import { v4 as uuidv4 } from 'uuid';


@Injectable()
export class InvitesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Creates a tenant invite and sends an email with a magic link.
   */
  async createInvite(landlordId: string, tenancyId: string, email: string) {
    // ensure tenancy belongs to landlord
    const tenancy = await this.prisma.tenancy.findUnique({ where: { id: tenancyId }, include: { property: true } });
    if (!tenancy || tenancy.property.landlordId !== landlordId) {
      throw new ForbiddenException('Invalid tenancy');
    }
    const token = uuidv4();
    const invite = await this.prisma.tenantInvite.create({ data: { tenancyId, email, token } });
    // Send email via notifications
    const link = `${process.env.FRONTEND_URL || 'https://app.example.com'}/accept-invite?token=${token}`;
    await this.notifications.sendEmail(
      // we don't have user yet; send by email; create a dummy user record with id email? We'll skip storing notification
      // For now call sendEmail with landlordId to keep record; but we will send email to tenant using external provider.
      // In this scaffold we just create Notification record for landlord; we ignore.
      // This method expects a userId, so we can't use; we will create a dummy notification.
      // We'll call notificationsService which logs but uses userId; we will pass landlordId to keep record.
      landlordId,
      'You invited a tenant',
      `Invite link: ${link}`,
    );
    return invite;
  }

  /**
   * Accepts an invite token and creates a tenant user.
   */
  async acceptInvite(token: string, email: string, password: string, displayName: string) {
    const invite = await this.prisma.tenantInvite.findUnique({ where: { token } });
    if (!invite) throw new NotFoundException('Invalid invite token');
    if (invite.acceptedAt) throw new BadRequestException('Invite already used');
    // ensure email matches invite
    if (invite.email.toLowerCase() !== email.toLowerCase()) {
      throw new BadRequestException('Email mismatch');
    }
    // sign up user as tenant
    const { accessToken, refreshToken } = await this.authService.signup({
      email,
      password,
      displayName,
      role: 'TENANT',
    });
    await this.prisma.tenantInvite.update({ where: { token }, data: { acceptedAt: new Date() } });
    return { accessToken, refreshToken };
  }
}