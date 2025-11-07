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
 * TrueLayer Bank Feed Provider
 * Implements Open Banking via TrueLayer API
 */
@Injectable()
export class TrueLayerProvider implements IBankFeedProvider {
  private readonly logger = new Logger(TrueLayerProvider.name);
  readonly name = 'TRUELAYER';
  private authUrl = 'https://auth.truelayer.com';
  private apiUrl = 'https://api.truelayer.com';
  private clientId: string;
  private clientSecret: string;

  constructor(private configService: ConfigService) {
    this.clientId = this.configService.get('TRUELAYER_CLIENT_ID', '');
    this.clientSecret = this.configService.get('TRUELAYER_CLIENT_SECRET', '');

    if (!this.clientId) {
      this.logger.warn('TrueLayer client ID not configured');
    }
  }

  /**
   * Initialize OAuth authorization flow
   */
  async initializeAuth(redirectUri: string, state?: string): Promise<BankConnectionData> {
    const stateParam = state || this.generateState();
    
    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.clientId,
      redirect_uri: redirectUri,
      scope: 'info accounts balance transactions offline_access',
      state: stateParam,
      providers: 'uk-ob-all uk-oauth-all',
    });

    const authorizationUrl = `${this.authUrl}/?${params.toString()}`;

    return {
      authorizationUrl,
      state: stateParam,
    };
  }

  /**
   * Exchange authorization code for access token
   */
  async exchangeAuthCode(code: string, redirectUri: string): Promise<BankAuthResult> {
    this.logger.log('Exchanging authorization code for access token');

    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: redirectUri,
      code,
    });

    const response = await this.makeRequest(
      'POST',
      `${this.authUrl}/connect/token`,
      params,
      {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    );

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token,
      expiresIn: response.expires_in,
      tokenType: response.token_type,
    };
  }

  /**
   * Refresh access token
   */
  async refreshAccessToken(refreshToken: string): Promise<BankAuthResult> {
    this.logger.log('Refreshing access token');

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: this.clientId,
      client_secret: this.clientSecret,
      refresh_token: refreshToken,
    });

    const response = await this.makeRequest(
      'POST',
      `${this.authUrl}/connect/token`,
      params,
      {
        'Content-Type': 'application/x-www-form-urlencoded',
      }
    );

    return {
      accessToken: response.access_token,
      refreshToken: response.refresh_token || refreshToken,
      expiresIn: response.expires_in,
      tokenType: response.token_type,
    };
  }

  /**
   * Fetch accounts for an authorized connection
   */
  async fetchAccounts(accessToken: string): Promise<BankAccountData[]> {
    this.logger.log('Fetching bank accounts');

    const response = await this.makeAuthenticatedRequest(
      'GET',
      '/data/v1/accounts',
      accessToken
    );

    return response.results.map((account: any) => ({
      id: account.account_id,
      accountNumber: account.account_number?.number,
      sortCode: account.account_number?.sort_code,
      iban: account.account_number?.iban,
      accountType: account.account_type,
      displayName: account.display_name || `${account.provider.display_name} Account`,
      currency: account.currency,
      balance: undefined, // Balance fetched separately
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
      from: startDate.toISOString().split('T')[0],
      to: endDate.toISOString().split('T')[0],
    });

    const response = await this.makeAuthenticatedRequest(
      'GET',
      `/data/v1/accounts/${accountId}/transactions?${params.toString()}`,
      accessToken
    );

    return response.results.map((tx: any) => ({
      id: tx.transaction_id,
      timestamp: new Date(tx.timestamp),
      description: tx.description,
      amount: Math.abs(tx.amount),
      currency: tx.currency,
      transactionType: tx.transaction_type.toUpperCase() as 'CREDIT' | 'DEBIT',
      merchantName: tx.merchant_name,
      reference: tx.transaction_id,
      category: tx.transaction_category,
      runningBalance: tx.running_balance?.amount,
    }));
  }

  /**
   * Get account balance
   */
  async getAccountBalance(accessToken: string, accountId: string): Promise<number> {
    this.logger.log(`Fetching balance for account ${accountId}`);

    const response = await this.makeAuthenticatedRequest(
      'GET',
      `/data/v1/accounts/${accountId}/balance`,
      accessToken
    );

    return response.results[0]?.current || 0;
  }

  /**
   * Make HTTP request
   */
  private async makeRequest(
    method: string,
    url: string,
    body?: URLSearchParams,
    headers?: Record<string, string>
  ): Promise<any> {
    const response = await fetch(url, {
      method,
      headers: headers || {},
      body: body ? body.toString() : undefined,
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`TrueLayer API error: ${response.status} ${JSON.stringify(responseData)}`);
    }

    return responseData;
  }

  /**
   * Make authenticated request to TrueLayer API
   */
  private async makeAuthenticatedRequest(
    method: string,
    path: string,
    accessToken: string
  ): Promise<any> {
    const url = `${this.apiUrl}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    const responseData = await response.json();

    if (!response.ok) {
      throw new Error(`TrueLayer API error: ${response.status} ${JSON.stringify(responseData)}`);
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
