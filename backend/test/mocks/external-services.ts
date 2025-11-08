/**
 * Mocks for external services (email, SMS, Stripe, S3, etc.)
 */

// Mock nodemailer
export const mockNodemailer = {
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({
      messageId: 'mock-message-id',
      accepted: ['test@example.com'],
      rejected: [],
    }),
    verify: jest.fn().mockResolvedValue(true),
  })),
};

// Mock AWS S3
export const mockS3Client = {
  send: jest.fn(),
  putObject: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      ETag: 'mock-etag',
      VersionId: 'mock-version-id',
    }),
  }),
  getObject: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({
      Body: Buffer.from('mock-file-content'),
      ContentType: 'application/pdf',
    }),
  }),
  deleteObject: jest.fn().mockReturnValue({
    promise: jest.fn().mockResolvedValue({}),
  }),
};

// Mock Stripe (if used)
export const mockStripe = {
  customers: {
    create: jest.fn().mockResolvedValue({ id: 'cus_mock123' }),
    retrieve: jest.fn().mockResolvedValue({ id: 'cus_mock123' }),
  },
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: 'pi_mock123',
      client_secret: 'pi_mock123_secret',
      status: 'requires_payment_method',
    }),
    confirm: jest.fn().mockResolvedValue({
      id: 'pi_mock123',
      status: 'succeeded',
    }),
  },
  charges: {
    create: jest.fn().mockResolvedValue({
      id: 'ch_mock123',
      status: 'succeeded',
    }),
  },
};

// Mock SMS service (Twilio, etc.)
export const mockSmsService = {
  send: jest.fn().mockResolvedValue({
    sid: 'SM_mock123',
    status: 'sent',
  }),
};

// Mock Redis/BullMQ (if needed)
export const mockRedis = {
  get: jest.fn(),
  set: jest.fn(),
  del: jest.fn(),
  exists: jest.fn(),
  expire: jest.fn(),
};

export const mockQueue = {
  add: jest.fn().mockResolvedValue({ id: 'job-123' }),
  getJob: jest.fn(),
  getJobs: jest.fn().mockResolvedValue([]),
  remove: jest.fn(),
  clean: jest.fn(),
};

