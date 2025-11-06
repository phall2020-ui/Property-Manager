import { Injectable, NotFoundException, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../common/prisma/prisma.service';
import { MockBankProvider } from '../providers/mock-bank.provider';
import { CreateBankConnectionDto } from '../dto/bank-connection.dto';
import { createHash } from 'crypto';

@Injectable()
export class BankingService {
  private readonly logger = new Logger(BankingService.name);

  constructor(
    private prisma: PrismaService,
    private mockBankProvider: MockBankProvider,
  ) {}

  /**
   * Create a new bank connection
   */
  async createConnection(landlordId: string, dto: CreateBankConnectionDto) {
    this.logger.log(`Creating bank connection for landlord ${landlordId}`);

    // For now, only support MOCK provider
    if (dto.provider !== 'MOCK') {
      throw new BadRequestException('Only MOCK provider is currently supported');
    }

    // Connect to provider
    const providerConnection = await this.mockBankProvider.connect();

    // Create connection record
    const connection = await this.prisma.bankConnection.create({
      data: {
        landlordId,
        provider: dto.provider,
        status: providerConnection.status,
        meta: dto.meta ? JSON.stringify(dto.meta) : null,
      },
    });

    this.logger.log(`Bank connection created: ${connection.id}`);

    // Immediately fetch and store accounts
    await this.syncAccounts(landlordId, connection.id);

    return connection;
  }

  /**
   * Get all bank connections for a landlord
   */
  async getConnections(landlordId: string) {
    return this.prisma.bankConnection.findMany({
      where: { landlordId },
      include: {
        accounts: {
          select: {
            id: true,
            name: true,
            iban: true,
            lastSyncedAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Get all bank accounts for a landlord
   */
  async getBankAccounts(landlordId: string) {
    return this.prisma.bankAccount.findMany({
      where: { landlordId },
      include: {
        connection: {
          select: {
            id: true,
            provider: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Sync accounts from provider
   */
  async syncAccounts(landlordId: string, connectionId: string) {
    this.logger.log(`Syncing accounts for connection ${connectionId}`);

    const connection = await this.prisma.bankConnection.findFirst({
      where: { id: connectionId, landlordId },
    });

    if (!connection) {
      throw new NotFoundException('Bank connection not found');
    }

    if (connection.provider !== 'MOCK') {
      throw new BadRequestException('Only MOCK provider is currently supported');
    }

    // Fetch accounts from provider
    const providerAccounts = await this.mockBankProvider.fetchAccounts(
      connectionId,
    );

    // Upsert accounts
    const accounts = [];
    for (const acc of providerAccounts) {
      const account = await this.prisma.bankAccount.upsert({
        where: {
          landlordId_connectionId_name: {
            landlordId,
            connectionId,
            name: acc.name,
          },
        },
        create: {
          landlordId,
          connectionId,
          name: acc.name,
          iban: acc.iban,
          accountNumber: acc.accountNumber,
          sortCode: acc.sortCode,
          lastSyncedAt: new Date(),
        },
        update: {
          iban: acc.iban,
          accountNumber: acc.accountNumber,
          sortCode: acc.sortCode,
          lastSyncedAt: new Date(),
        },
      });
      accounts.push(account);
    }

    this.logger.log(`Synced ${accounts.length} accounts`);
    return accounts;
  }

  /**
   * Sync transactions for an account
   */
  async syncTransactions(landlordId: string, bankAccountId?: string) {
    this.logger.log(`Syncing transactions for landlord ${landlordId}`);

    // Get accounts to sync
    const accounts = await this.prisma.bankAccount.findMany({
      where: {
        landlordId,
        ...(bankAccountId ? { id: bankAccountId } : {}),
      },
      include: {
        connection: true,
      },
    });

    if (accounts.length === 0) {
      throw new NotFoundException('No bank accounts found');
    }

    let totalSynced = 0;

    for (const account of accounts) {
      // Fetch last 90 days of transactions
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 90);

      // Fetch from provider
      const providerTransactions =
        await this.mockBankProvider.fetchTransactions(
          account.id,
          startDate,
          endDate,
        );

      // Store transactions with deduplication
      for (const tx of providerTransactions) {
        // Create hash for deduplication
        const hash = this.createTransactionHash(
          account.id,
          tx.postedAt,
          tx.amount,
          tx.description,
        );

        try {
          await this.prisma.bankTransaction.create({
            data: {
              landlordId,
              bankAccountId: account.id,
              postedAt: tx.postedAt,
              amount: tx.amount,
              description: tx.description,
              reference: tx.reference,
              currency: tx.currency,
              hash,
              rawString: JSON.stringify(tx),
            },
          });
          totalSynced++;
        } catch (error: any) {
          // Duplicate transaction (hash already exists), skip
          if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
            this.logger.debug(`Skipping duplicate transaction: ${hash}`);
          } else {
            throw error;
          }
        }
      }

      // Update lastSyncedAt
      await this.prisma.bankAccount.update({
        where: { id: account.id },
        data: { lastSyncedAt: new Date() },
      });
    }

    this.logger.log(`Synced ${totalSynced} new transactions`);
    return { synced: totalSynced };
  }

  /**
   * Create a hash for transaction deduplication
   */
  private createTransactionHash(
    accountId: string,
    postedAt: Date,
    amount: number,
    description: string,
  ): string {
    const data = `${accountId}_${postedAt.toISOString()}_${amount}_${description}`;
    return createHash('sha256').update(data).digest('hex');
  }
}
