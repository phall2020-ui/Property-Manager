import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  IBankFeedProvider,
  BankAccountData,
  BankTransactionData,
  BankConnectionData,
  BankAuthResult,
} from './bank-feed-provider.interface';

/**
 * Yapily Bank Feed Provider
 * Implements Open Banking via Yapily API
 */
@Injectable()
export class YapilyProvider implements IBankFeedProvider {
  private readonly logger = new Logger(YapilyProvider.name);
  readonly name = 'YAPILY';
  private apiUrl: string;
  private applicationId: string;
  private applicationSecret: string;

  constructor(private configService: ConfigService) {
    const environment = this.configService.get('YAPILY_ENVIRONMENT', 'sandbox');
    this.apiUrl = environment === 'live'
      ? 'https://api.yapily.com'
      : 'https://api.sandbox.yapily.com';
    this.applicationId = this.configService.get('YAPILY_APPLICATION_ID', '');
    this.applicationSecret = this.configService.get('YAPILY_APPLICATION_SECRET', '');

    if (!this.applicationId) {
      this.logger.warn('Yapily application ID not configured');
    }
  }

  /**
   * Initialize OAuth authorization flow
   */
  async initializeAuth(redirectUri: string, state?: string): Promise<BankConnectionData> {
    const stateParam = state || this.generateState();

    // Create authorization request
    const response = await this.makeRequest('POST', '/users-consents', {
      applicationUserId: stateParam,
      institutionId: 'modelo-sandbox', // Default institution for demo
      callback: redirectUri,
      featureScope: ['ACCOUNTS', 'ACCOUNT_DETAILS', 'TRANSACTIONS'],
    });

    return {
      authorizationUrl: response.data.authorisationUrl,
      state: stateParam,
    };
  }

  /**
   * Exchange authorization code for access token
   * Note: Yapily uses a different model - consent tokens are returned via callback
   */
  async exchangeAuthCode(code: string, redirectUri: string): Promise<BankAuthResult> {
    this.logger.log('Processing authorization callback');

    // In Yapily, the 'code' is actually the consent token
    // No exchange needed, the consent is already authorized
    return {
      accessToken: code,
      expiresIn: 90 * 24 * 60 * 60, // 90 days default
      tokenType: 'consent',
    };
  }

  /**
   * Refresh access token
   * Note: Yapily consents don't expire in the same way
   */
  async refreshAccessToken(refreshToken: string): Promise<BankAuthResult> {
    this.logger.log('Refreshing consent token');

    // Yapily consents are long-lived and don't require refresh
    // Return the same token
    return {
      accessToken: refreshToken,
      expiresIn: 90 * 24 * 60 * 60,
      tokenType: 'consent',
    };
  }

  /**
   * Fetch accounts for an authorized connection
   */
  async fetchAccounts(accessToken: string): Promise<BankAccountData[]> {
    this.logger.log('Fetching bank accounts');

    const response = await this.makeAuthenticatedRequest(
      'GET',
      '/accounts',
      accessToken
    );

    return response.data.map((account: any) => ({
      id: account.id,
      accountNumber: account.accountIdentifications?.find(
        (id: any) => id.type === 'ACCOUNT_NUMBER'
      )?.identification,
      sortCode: account.accountIdentifications?.find(
        (id: any) => id.type === 'SORT_CODE'
      )?.identification,
      iban: account.accountIdentifications?.find(
        (id: any) => id.type === 'IBAN'
      )?.identification,
      accountType: account.accountType,
      displayName: account.accountNames?.[0]?.name || account.nickname || 'Account',
      currency: account.currency,
      balance: account.balance?.amount,
    }));
  }

  /**
   * Fetch transactions for a specific account
   */
  async fetchTransactions(
    accessToken: string,
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BankTransactionData[]> {
    this.logger.log(`Fetching transactions for account ${accountId}`);

    const params = new URLSearchParams({
      from: startDate.toISOString(),
      to: endDate.toISOString(),
    });

    const response = await this.makeAuthenticatedRequest(
      'GET',
      `/accounts/${accountId}/transactions?${params.toString()}`,
      accessToken
    );

    return response.data.map((tx: any) => ({
      id: tx.id,
      timestamp: new Date(tx.timestamp || tx.bookingDateTime),
      description: tx.description || tx.transactionInformation || '',
      amount: Math.abs(tx.amount),
      currency: tx.currency,
      transactionType: tx.amount >= 0 ? 'CREDIT' : 'DEBIT',
      merchantName: tx.merchantDetails?.merchantName,
      reference: tx.reference || tx.id,
      category: tx.transactionCategory,
      runningBalance: tx.balance?.amount,
    }));
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accessToken: string, accountId: string): Promise<number> {
    this.logger.log(`Fetching balance for account ${accountId}`);

    const response = await this.makeAuthenticatedRequest(
      'GET',
      `/accounts/${accountId}/balances`,
      accessToken
    );

    // Return the current balance
    const currentBalance = response.data.find(
      (b: any) => b.type === 'CLOSING_AVAILABLE' || b.type === 'INTERIM_AVAILABLE'
    );

    return currentBalance?.balanceAmount?.amount || 0;
  }

  /**
   * Make HTTP request to Yapily API
   */
  private async makeRequest(
    method: string,
    path: string,
    body?: any
  ): Promise<any> {
    const url = `${this.apiUrl}${path}`;

    const auth = Buffer.from(`${this.applicationId}:${this.applicationSecret}`).toString('base64');

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`Yapily API error: ${response.status} ${JSON.stringify(responseData)}`);
    }

    return responseData;
  }

  /**
   * Make authenticated request to Yapily API
   */
  private async makeAuthenticatedRequest(
    method: string,
    path: string,
    consentToken: string
  ): Promise<any> {
    const url = `${this.apiUrl}${path}`;

    const auth = Buffer.from(`${this.applicationId}:${this.applicationSecret}`).toString('base64');

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Basic ${auth}`,
        'consent': consentToken,
        'Content-Type': 'application/json',
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`Yapily API error: ${response.status} ${JSON.stringify(responseData)}`);
    }

    return responseData;
  }

  /**
   * Generate random state for OAuth
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) +
           Math.random().toString(36).substring(2, 15);
  }
}
