'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { finishPaidPendingOrder } from '@/lib/pending-order';
import { getOrder, type OrderDetail } from '@/services/order.service';
import { ZaloPaySandboxPanel } from '@/components/payments/zalopay-sandbox-panel';
import type { ZaloPayPayment } from '@/services/zalopay.service';
import { money } from '@/lib/money';
import { useCartStore } from '@/store/useCartStore';

export default function PaymentGatewayPage() {
  const { id } = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [error, setError] = useState('');
  const [sandboxPending, setSandboxPending] = useState(true);
  const [sandboxPayment, setSandboxPayment] = useState<ZaloPayPayment | null>(null);
  const paid = Boolean(order && ['PAID', 'PREPARING', 'READY', 'COMPLETED'].includes(order.status));
  const payable = order?.status === 'PENDING' || order?.status === 'PAYMENT_FAILED';

  useEffect(() => {
    let active = true;
    let sequence = 0;
    let token = localStorage.getItem('token');
    async function load() {
      const currentSequence = ++sequence;
      const currentToken = localStorage.getItem('token');
      setOrder(null);
      setSandboxPayment(null);
      setSandboxPending(true);
      setError('');
      if (!currentToken) {
        setError('Vui lòng đăng nhập để xem kết quả thanh toán.');
        return;
      }
      try {
        const value = await getOrder(id);
        if (!active || currentSequence !== sequence || localStorage.getItem('token') !== currentToken) return;
        setOrder(value);
        if (value.status === 'PAID' && localStorage.getItem('brewlite-pending-order-id') === value.id) {
          if (finishPaidPendingOrder(localStorage, value.id)) useCartStore.getState().clearCart();
        }
      } catch (cause) {
        if (active && currentSequence === sequence && localStorage.getItem('token') === currentToken) {
          setError(cause instanceof Error ? cause.message : 'Không thể tải đơn hàng.');
        }
      }
    }
    function onAuthChange() {
      const nextToken = localStorage.getItem('token');
      if (nextToken === token) return;
      token = nextToken;
      void load();
    }
    void load();
    window.addEventListener('auth-changed', onAuthChange);
    window.addEventListener('storage', onAuthChange);
    return () => {
      active = false;
      window.removeEventListener('auth-changed', onAuthChange);
      window.removeEventListener('storage', onAuthChange);
    };
  }, [id]);

  return <section className="mx-auto max-w-2xl space-y-6">
    <Link href={`/orders/${id}`} className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-primary hover:underline"><ArrowLeft size={17} /> Chi tiết đơn hàng</Link>
    <header className="border-b-[1.5px] border-ink pb-4"><p className="kicker">Bước 3 / 3, thanh toán thử nghiệm</p><h1 className="mt-2 text-3xl font-extrabold tracking-[-0.03em] text-ink sm:text-4xl">Thanh toán đơn hàng</h1><p className="mt-2 max-w-xl text-sm leading-6 text-content-secondary">Thanh toán qua ZaloPay Sandbox. Không sử dụng tiền thật.</p></header>
    {error && <p role="alert" className="rounded-ticket border-l-4 border-danger bg-danger-light p-4 text-sm text-danger">{error}</p>}
    {!order && !error && <p role="status" className="ticket p-6 text-content-secondary">Đang tải đơn hàng...</p>}
    {order && paid && <section role="status" aria-labelledby="payment-success-title" className="ticket border-success/40 bg-success-light p-6 sm:p-8">
      <CheckCircle2 size={44} className="text-success" aria-hidden="true" />
      <h2 id="payment-success-title" className="mt-4 text-2xl font-extrabold text-success">{sandboxPayment?.status === 'SUCCESS' && !sandboxPayment.reviewReason ? 'Thanh toán thành công — ZaloPay Sandbox' : 'Thanh toán thành công'}</h2>
      <p className="mt-3 font-semibold text-navy">Đơn #{order.orderNumber}, {money(order.finalAmount)}</p>
      {sandboxPayment?.reference && !sandboxPayment.reviewReason && <p className="mt-2 break-all text-sm text-content-secondary">Mã giao dịch: {sandboxPayment.reference}</p>}
      <p className="mt-2 text-sm text-content-secondary">Hệ thống đã ghi nhận đơn hàng được thanh toán. Đây là giao dịch thử nghiệm.</p>
      <div className="mt-5 flex flex-wrap gap-3"><Link href={`/orders/${order.id}`} className="btn-primary">Xem đơn hàng</Link><Link href="/menu" className="btn-outline">Tiếp tục mua hàng</Link></div>
    </section>}
    {order && <ZaloPaySandboxPanel order={order} onOrderUpdated={setOrder} onPendingChange={setSandboxPending} onPaymentChange={setSandboxPayment} />}
    {order && payable && sandboxPending && <p role="status" className="text-sm text-content-secondary">Đang kiểm tra hoặc đang có giao dịch ZaloPay.</p>}
    {order && !paid && !payable && <p className="ticket p-6 font-semibold text-navy">Đơn hàng này không còn chờ thanh toán.</p>}
  </section>;
}
