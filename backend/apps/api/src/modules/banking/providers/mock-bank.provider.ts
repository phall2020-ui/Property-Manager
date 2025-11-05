import { Injectable, Logger } from '@nestjs/common';

export interface BankAccountData {
  id: string;
  name: string;
  iban?: string;
  accountNumber?: string;
  sortCode?: string;
}

export interface BankTransactionData {
  id: string;
  postedAt: Date;
  amount: number;
  description: string;
  reference?: string;
  currency: string;
}

export interface IBankProvider {
  connect(): Promise<{ connectionId: string; status: string }>;
  fetchAccounts(connectionId: string): Promise<BankAccountData[]>;
  fetchTransactions(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BankTransactionData[]>;
}

@Injectable()
export class MockBankProvider implements IBankProvider {
  private readonly logger = new Logger(MockBankProvider.name);

  async connect(): Promise<{ connectionId: string; status: string }> {
    this.logger.log('Mock bank connection initiated');
    return {
      connectionId: `mock_conn_${Date.now()}`,
      status: 'ACTIVE',
    };
  }

  async fetchAccounts(connectionId: string): Promise<BankAccountData[]> {
    this.logger.log(`Fetching accounts for connection: ${connectionId}`);
    
    // Return mock accounts
    return [
      {
        id: `acc_${Date.now()}_1`,
        name: 'Property Rental Account',
        iban: 'GB29NWBK60161331926819',
        accountNumber: '31926819',
        sortCode: '60-16-13',
      },
      {
        id: `acc_${Date.now()}_2`,
        name: 'Property Deposits Account',
        iban: 'GB12BARC20201530093459',
        accountNumber: '30093459',
        sortCode: '20-20-15',
      },
    ];
  }

  async fetchTransactions(
    accountId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<BankTransactionData[]> {
    this.logger.log(
      `Fetching transactions for account ${accountId} from ${startDate.toISOString()} to ${endDate.toISOString()}`,
    );

    // Generate mock transactions
    const transactions: BankTransactionData[] = [];
    const daysDiff = Math.ceil(
      (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    // Generate 5-10 transactions within the date range
    const txCount = Math.min(Math.floor(Math.random() * 6) + 5, daysDiff);

    for (let i = 0; i < txCount; i++) {
      const randomDays = Math.floor(Math.random() * daysDiff);
      const txDate = new Date(startDate);
      txDate.setDate(txDate.getDate() + randomDays);

      // Generate various types of transactions
      const amounts = [850, 1200, 975, 1150, 800, 1300, 950];
      const amount = amounts[Math.floor(Math.random() * amounts.length)];

      const refNumbers = ['INV-2024-001', 'INV-2024-002', 'INV-2024-003', 'RENT-PAYMENT', 'DEPOSIT'];
      const reference = refNumbers[Math.floor(Math.random() * refNumbers.length)];

      transactions.push({
        id: `tx_${accountId}_${Date.now()}_${i}`,
        postedAt: txDate,
        amount: amount,
        description: `Rent payment - ${reference}`,
        reference: reference,
        currency: 'GBP',
      });
    }

    return transactions.sort(
      (a, b) => b.postedAt.getTime() - a.postedAt.getTime(),
    );
  }
}
