// MOCK is retained only so historical rows still render; new payments use ZaloPay Sandbox.
export type PaymentSource = 'MOCK' | 'ZALOPAY_SANDBOX' | 'BANK_TRANSFER';
export type PaymentStatus = 'SUCCESS' | 'PENDING' | 'FAILED';
export type Reconciliation = 'MATCHED' | 'WAITING' | 'AMOUNT_MISMATCH' | 'UNMATCHED' | 'NEEDS_REVIEW';

export interface ManagedPayment {
  id: string;
  orderNumber: number | null;
  customer: string;
  source: PaymentSource;
  method: 'E_WALLET' | 'BANK_CARD' | 'BANK_TRANSFER';
  amount: number;
  expectedAmount: number | null;
  status: PaymentStatus;
  reconciliation: Reconciliation;
  reference: string | null;
  description: string;
  failureReason: string | null;
  reviewReason?: string | null;
  createdAt: string;
}

export interface PaymentManagementResult {
  items: ManagedPayment[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
  summary: { bank: number; test: number; pending: number; attention: number };
}

export interface PaymentFilters {
  // ZaloPay Sandbox is the only payment source still offered by the backend.
  source: 'ALL' | 'ZALOPAY_SANDBOX';
  status: PaymentStatus | 'ALL' | 'REVIEW';
  search: string;
  from: string;
  to: string;
}
