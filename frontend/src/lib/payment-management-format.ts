import type { ManagedPayment, PaymentFilters, PaymentSource, PaymentStatus, Reconciliation } from '../types/payment-management';

// MOCK is only kept for historical rows created before ZaloPay became the sole source.
export const sourceLabels: Record<PaymentSource, string> = {
  MOCK: 'Mock (lưu trữ)',
  ZALOPAY_SANDBOX: 'ZaloPay Sandbox',
  BANK_TRANSFER: 'Chuyển khoản ngân hàng',
};

export const statusLabels: Record<PaymentStatus, string> = {
  SUCCESS: 'Thành công', PENDING: 'Đang chờ', FAILED: 'Thất bại',
};

export const reconciliationLabels: Record<Reconciliation, string> = {
  MATCHED: 'Khớp đơn hàng', WAITING: 'Chờ xác nhận',
  AMOUNT_MISMATCH: 'Sai số tiền', UNMATCHED: 'Chưa tìm thấy đơn',
  NEEDS_REVIEW: 'Cần kiểm tra',
};

export const initialFilters: PaymentFilters = {
  source: 'ALL', status: 'ALL', search: '', from: '', to: '',
};

const amountFormat = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });
const timeFormat = new Intl.DateTimeFormat('vi-VN', {
  day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  timeZone: 'Asia/Ho_Chi_Minh',
});

export const formatPaymentMoney = (value: number) => amountFormat.format(value);
export const formatPaymentTime = (value: string) => timeFormat.format(new Date(value));

export function needsPaymentReview(payment: ManagedPayment) {
  return payment.reconciliation === 'AMOUNT_MISMATCH' || payment.reconciliation === 'UNMATCHED' || payment.reconciliation === 'NEEDS_REVIEW';
}
