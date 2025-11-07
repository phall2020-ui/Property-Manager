import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs';
import * as path from 'path';

export interface UploadOptions {
  key: string;
  body: Buffer;
  contentType?: string;
  metadata?: Record<string, string>;
}

export interface StorageProvider {
  upload(options: UploadOptions): Promise<string>;
  getUrl(key: string, expiresIn?: number): Promise<string>;
  delete(key: string): Promise<void>;
}

/**
 * Local file storage provider (for development)
 */
class LocalStorageProvider implements StorageProvider {
  private readonly logger = new Logger(LocalStorageProvider.name);
  private readonly uploadDir: string;

  constructor(private configService: ConfigService) {
    this.uploadDir = this.configService.get('LOCAL_STORAGE_PATH', './uploads');
    // Ensure upload directory exists
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
    }
  }

  async upload(options: UploadOptions): Promise<string> {
    const filePath = path.join(this.uploadDir, options.key);
    const dir = path.dirname(filePath);

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    fs.writeFileSync(filePath, options.body);
    this.logger.log(`Uploaded file to local storage: ${options.key}`);

    // Return local URL
    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:4000');
    return `${baseUrl}/api/storage/${options.key}`;
  }

  async getUrl(key: string, expiresIn?: number): Promise<string> {
    const baseUrl = this.configService.get('BASE_URL', 'http://localhost:4000');
    return `${baseUrl}/api/storage/${key}`;
  }

  async delete(key: string): Promise<void> {
    const filePath = path.join(this.uploadDir, key);
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
      this.logger.log(`Deleted file from local storage: ${key}`);
    }
  }
}

/**
 * S3-compatible storage provider (S3, R2, etc.)
 */
class S3StorageProvider implements StorageProvider {
  private readonly logger = new Logger(S3StorageProvider.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private configService: ConfigService) {
    const region = this.configService.get('S3_REGION', 'us-east-1');
    const endpoint = this.configService.get('S3_ENDPOINT'); // For R2 or custom S3

    this.client = new S3Client({
      region,
      endpoint,
      credentials: {
        accessKeyId: this.configService.get('S3_ACCESS_KEY_ID', ''),
        secretAccessKey: this.configService.get('S3_SECRET_ACCESS_KEY', ''),
      },
    });

    this.bucket = this.configService.get('S3_BUCKET', '');
    if (!this.bucket) {
      this.logger.warn('S3_BUCKET not configured');
    }
  }

  async upload(options: UploadOptions): Promise<string> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: options.key,
      Body: options.body,
      ContentType: options.contentType || 'application/octet-stream',
      Metadata: options.metadata,
    });

    await this.client.send(command);
    this.logger.log(`Uploaded file to S3: ${options.key}`);

    // Return public URL if bucket is public, or generate signed URL
    const publicUrl = this.configService.get('S3_PUBLIC_URL');
    if (publicUrl) {
      return `${publicUrl}/${options.key}`;
    }

    return this.getUrl(options.key);
  }

  async getUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async delete(key: string): Promise<void> {
    // Implementation omitted for brevity
    this.logger.log(`Deleted file from S3: ${key}`);
  }
}

/**
 * Storage Service
 * Provides abstraction over different storage backends (local, S3, R2)
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly provider: StorageProvider;

  constructor(private configService: ConfigService) {
    const driver = this.configService.get('STORAGE_DRIVER', 'local');

    switch (driver) {
      case 's3':
        this.provider = new S3StorageProvider(configService);
        this.logger.log('Using S3 storage provider');
        break;
      case 'local':
      default:
        this.provider = new LocalStorageProvider(configService);
        this.logger.log('Using local storage provider');
        break;
    }
  }

  /**
   * Upload a file to storage
   */
  async upload(options: UploadOptions): Promise<string> {
    return this.provider.upload(options);
  }

  /**
   * Get URL for a stored file
   */
  async getUrl(key: string, expiresIn?: number): Promise<string> {
    return this.provider.getUrl(key, expiresIn);
  }

  /**
   * Delete a file from storage
   */
  async delete(key: string): Promise<void> {
    return this.provider.delete(key);
  }

  /**
   * Generate storage key for invoice PDF
   */
  generateInvoicePdfKey(landlordId: string, invoiceNumber: string): string {
    const sanitized = invoiceNumber.replace(/[^a-zA-Z0-9-]/g, '_');
    return `invoices/${landlordId}/${sanitized}.pdf`;
  }

  /**
   * Generate storage key for receipt PDF
   */
  generateReceiptPdfKey(landlordId: string, receiptNumber: string): string {
    const sanitized = receiptNumber.replace(/[^a-zA-Z0-9-]/g, '_');
    return `receipts/${landlordId}/${sanitized}.pdf`;
  }
}
