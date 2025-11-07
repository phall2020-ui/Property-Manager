/**
 * Bank Feed Provider Interface
 * Abstraction for Open Banking providers like TrueLayer, Yapily
 */

export interface BankAccountData {
  id: string;
  accountNumber?: string;
  sortCode?: string;
  iban?: string;
  accountType: string;
  displayName: string;
  currency: string;
  balance?: number;
}

export interface BankTransactionData {
  id: string;
  timestamp: Date;
  description: string;
  amount: number;
  currency: string;
  transactionType: 'CREDIT' | 'DEBIT';
  merchantName?: string;
  reference?: string;
  category?: string;
  runningBalance?: number;
}

export interface BankConnectionData {
  authorizationUrl: string;
  state: string;
}

export interface BankAuthResult {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: string;
}

/**
 * Bank Feed Provider Interface
 */
export interface IBankFeedProvider {
  /**
   * Provider identifier
   */
  readonly name: string;

  /**
   * Initialize OAuth authorization flow
   * Returns URL to redirect user to for bank authorization
   */
  initializeAuth(redirectUri: string, state?: string): Promise<BankConnectionData>;

  /**
   * Exchange authorization code for access token
   */
  exchangeAuthCode(code: string, redirectUri: string): Promise<BankAuthResult>;

  /**
   * Refresh access token
   */
  refreshAccessToken(refreshToken: string): Promise<BankAuthResult>;

  /**
   * Fetch accounts for an authorized connection
   */
  fetchAccounts(accessToken: string): Promise<BankAccountData[]>;

  /**
   * Fetch transactions for a specific account
   */
  fetchTransactions(
    accessToken: string,
    accountId: string,
    startDate: Date,
    endDate: Date
  ): Promise<BankTransactionData[]>;

  /**
   * Get account balance
   */
  getAccountBalance(accessToken: string, accountId: string): Promise<number>;
}
