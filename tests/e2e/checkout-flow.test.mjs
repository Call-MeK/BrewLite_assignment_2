import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { test } from 'node:test';

/**
 * E2E: menu → product detail → order → confirmation (Task 5.2).
 *
 * Chạy trên một stack thật (docker compose hoặc URL production đã seed):
 *   $env:E2E_API_URL='http://localhost:4000/api/v1'; node --test tests/e2e
 *
 * Không có E2E_API_URL thì test tự bỏ qua, nhờ vậy CI/local vẫn chạy được
 * khi chưa dựng stack. Test tạo tài khoản mới và tự huỷ đơn ở cuối.
 */
const api = process.env.E2E_API_URL?.replace(/\/$/, '');

async function call(path, method = 'GET', body, token) {
  const response = await fetch(`${api}${path}`, {
    method,
    headers: {
      ...(body ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { code: response.status, body: await response.json().catch(() => null) };
}

test('khách xem menu, mở chi tiết, đặt đơn và thấy đơn trong lịch sử', { skip: !api && 'đặt E2E_API_URL để chạy E2E' }, async () => {
  const email = `e2e-${randomUUID()}@example.test`;
  const registered = await call('/auth/register', 'POST', { email, password: 'e2e-password', fullName: 'E2E Khách' });
  assert.equal(registered.code, 201);
  const token = registered.body.data.accessToken;

  // 1. Menu: phải có ít nhất một sản phẩm còn bán.
  const menu = await call('/products');
  assert.equal(menu.code, 200);
  const product = menu.body.data.find((item) => item.isAvailable && item.sizePrices.some((size) => size.isAvailable));
  assert.ok(product, 'menu phải có sản phẩm còn bán');

  // 2. Chi tiết: size, giá và tồn khả dụng.
  const detail = await call(`/products/${product.id}`);
  assert.equal(detail.code, 200);
  assert.equal(detail.body.data.id, product.id);
  const size = detail.body.data.sizePrices.find((entry) => entry.isAvailable);
  assert.ok(Number(detail.body.data.basePrice) > 0);

  // 3. Đặt đơn với size đã chọn.
  const created = await call('/orders', 'POST', { items: [{ productId: product.id, size: size.size, quantity: 1 }] }, token);
  assert.equal(created.code, 201);
  assert.equal(created.body.data.status, 'PENDING');
  assert.ok(Number(created.body.data.finalAmount) > 0);

  // 4. Xác nhận: đơn xuất hiện trong lịch sử của khách.
  const history = await call('/orders/me', 'GET', undefined, token);
  assert.equal(history.code, 200);
  assert.ok(history.body.data.items.some((order) => order.id === created.body.data.id));

  // 5. Dọn dẹp: huỷ đơn để hoàn tồn kho.
  const cancelled = await call(`/orders/${created.body.data.id}/cancel`, 'POST', undefined, token);
  assert.equal(cancelled.body.data.status, 'CANCELLED');
});