import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StorageService {
  private readonly s3: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    this.s3 = new S3Client({
      credentials: {
        accessKeyId: this.config.get<string>('s3.accessKeyId'),
        secretAccessKey: this.config.get<string>('s3.secretAccessKey'),
      },
      region: this.config.get<string>('s3.region'),
    });
    this.bucket = this.config.get<string>('s3.bucket');
  }

  /**
   * Generates a signed URL for uploading a document directly to S3.
   * Returns the URL and the key to be used when recording the document.
   */
  async getSignedUploadUrl(contentType: string): Promise<{ url: string; key: string }> {
    // Validate content type and enforce allowed types
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'application/pdf'];
    if (!allowed.includes(contentType)) {
      throw new Error('Unsupported content type');
    }
    const key = `${uuidv4()}`;
    const command = new PutObjectCommand({ Bucket: this.bucket, Key: key, ContentType: contentType });
    const url = await getSignedUrl(this.s3, command, { expiresIn: 60 * 5 });
    return { url, key };
  }

  /**
   * Upload a file directly to S3 (for server-side uploads).
   * Returns the URL and key of the uploaded file.
   */
  async uploadFile(file: Express.Multer.File): Promise<{ url: string; fileId: string; key: string }> {
    const key = `${uuidv4()}-${file.originalname}`;
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    });
    
    await this.s3.send(command);
    
    // Generate public URL (assumes bucket is configured for public access or signed URLs)
    const url = `https://${this.bucket}.s3.${this.config.get<string>('s3.region')}.amazonaws.com/${key}`;
    
    return { url, fileId: key, key };
  }
}