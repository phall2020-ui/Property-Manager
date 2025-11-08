import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StorageService,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn((key: string, defaultValue?: any) => {
              const config = {
                STORAGE_PROVIDER: 'local',
                STORAGE_DRIVER: 'local',
                LOCAL_STORAGE_PATH: './uploads',
                BASE_URL: 'http://localhost:4000',
                'app.storage.allowedMimeTypes': [
                  'image/jpeg',
                  'image/png',
                  'application/pdf',
                ],
                'app.storage.maxFileSize': 10485760,
              };
              return config[key] || defaultValue;
            }),
          },
        },
      ],
    }).compile();

    service = module.get<StorageService>(StorageService);
    configService = module.get<ConfigService>(ConfigService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getPresignedUploadUrl', () => {
    it('should generate a presigned URL for valid content type', async () => {
      const result = await service.getPresignedUploadUrl('image/jpeg');

      expect(result).toHaveProperty('url');
      expect(result).toHaveProperty('key');
      expect(result).toHaveProperty('fields');
      expect(result.key).toMatch(/^uploads\/\d+-[a-z0-9]+\.jpg$/);
    });

    it('should generate correct file extension based on MIME type', async () => {
      const pdfResult = await service.getPresignedUploadUrl('application/pdf');
      expect(pdfResult.key).toMatch(/\.pdf$/);

      const pngResult = await service.getPresignedUploadUrl('image/png');
      expect(pngResult.key).toMatch(/\.png$/);

      const jpegResult = await service.getPresignedUploadUrl('image/jpeg');
      expect(jpegResult.key).toMatch(/\.jpg$/);
    });

    it('should handle content types without extensions', async () => {
      const result = await service.getPresignedUploadUrl('application/octet-stream');
      expect(result.key).toMatch(/^uploads\/\d+-[a-z0-9]+$/);
    });
  });

  describe('upload', () => {
    it('should upload a file and return URL', async () => {
      const buffer = Buffer.from('test file content');
      const url = await service.upload({
        key: 'test-key.txt',
        body: buffer,
        contentType: 'text/plain',
      });

      expect(url).toContain('test-key.txt');
    });
  });

  describe('getUrl', () => {
    it('should return URL for a given key', async () => {
      const url = await service.getUrl('test-key.txt');
      expect(url).toContain('test-key.txt');
    });
  });
});
