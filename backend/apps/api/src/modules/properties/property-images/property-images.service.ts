import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { StorageService } from '../../../lib/storage/storage.service';

@Injectable()
export class PropertyImagesService {
  private readonly logger = new Logger(PropertyImagesService.name);
  private readonly MAX_IMAGES_PER_PROPERTY = 10;
  private readonly MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  private readonly ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async create(
    propertyId: string,
    ownerOrgId: string,
    file: Express.Multer.File,
    data?: { name?: string; sortOrder?: number },
  ) {
    // Verify property ownership
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      include: { images: true },
    });

    if (!property || property.ownerOrgId !== ownerOrgId || property.deletedAt) {
      throw new NotFoundException('Property not found');
    }

    // Check image count limit
    if (property.images.length >= this.MAX_IMAGES_PER_PROPERTY) {
      throw new BadRequestException(
        `Maximum ${this.MAX_IMAGES_PER_PROPERTY} images allowed per property`,
      );
    }

    // Validate file
    if (file.size > this.MAX_FILE_SIZE) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }

    if (!this.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      throw new BadRequestException(
        'Invalid file type. Only JPEG, PNG, and WebP images are allowed',
      );
    }

    // Upload to storage service
    const uploadResult = await this.storage.uploadFile(file);

    // Create database record with consistent field access
    const image = await this.prisma.propertyImage.create({
      data: {
        propertyId,
        ownerOrgId,
        fileId: uploadResult.fileId, // Storage service now consistently returns fileId
        url: uploadResult.url,
        name: data?.name || file.originalname,
        sortOrder: data?.sortOrder || property.images.length,
      },
    });

    this.logger.log({
      action: 'property.image.created',
      propertyId,
      imageId: image.id,
      ownerOrgId,
    });

    return image;
  }

  async findAll(propertyId: string, ownerOrgId: string) {
    // Verify property ownership
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, ownerOrgId: true, deletedAt: true },
    });

    if (!property || property.ownerOrgId !== ownerOrgId || property.deletedAt) {
      throw new NotFoundException('Property not found');
    }

    return this.prisma.propertyImage.findMany({
      where: { propertyId },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async update(
    propertyId: string,
    imageId: string,
    ownerOrgId: string,
    data: { name?: string; sortOrder?: number },
  ) {
    // Verify property ownership
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, ownerOrgId: true, deletedAt: true },
    });

    if (!property || property.ownerOrgId !== ownerOrgId || property.deletedAt) {
      throw new NotFoundException('Property not found');
    }

    // Verify image belongs to property
    const image = await this.prisma.propertyImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.propertyId !== propertyId) {
      throw new NotFoundException('Image not found');
    }

    const updated = await this.prisma.propertyImage.update({
      where: { id: imageId },
      data,
    });

    this.logger.log({
      action: 'property.image.updated',
      propertyId,
      imageId,
      ownerOrgId,
    });

    return updated;
  }

  async delete(propertyId: string, imageId: string, ownerOrgId: string) {
    // Verify property ownership
    const property = await this.prisma.property.findUnique({
      where: { id: propertyId },
      select: { id: true, ownerOrgId: true, deletedAt: true },
    });

    if (!property || property.ownerOrgId !== ownerOrgId || property.deletedAt) {
      throw new NotFoundException('Property not found');
    }

    // Verify image belongs to property
    const image = await this.prisma.propertyImage.findUnique({
      where: { id: imageId },
    });

    if (!image || image.propertyId !== propertyId) {
      throw new NotFoundException('Image not found');
    }

    // Delete from database
    await this.prisma.propertyImage.delete({
      where: { id: imageId },
    });

    // TODO: Implement storage cleanup strategy
    // Currently, files are kept in storage for audit/recovery purposes
    // Consider implementing:
    // 1. Scheduled cleanup job for orphaned files
    // 2. Soft delete with grace period before permanent deletion
    // 3. Lifecycle policies on the storage bucket
    // Uncomment the following to enable immediate deletion:
    // try {
    //   await this.storage.deleteFile(image.fileId);
    // } catch (error) {
    //   this.logger.warn(`Failed to delete file from storage: ${error.message}`);
    // }

    this.logger.log({
      action: 'property.image.deleted',
      propertyId,
      imageId,
      ownerOrgId,
    });

    return { message: 'Image deleted successfully' };
  }
}
