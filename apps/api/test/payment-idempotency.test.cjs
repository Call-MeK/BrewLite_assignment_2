const assert = require('node:assert/strict');
const { test } = require('node:test');
const { Prisma } = require('@prisma/client');
const { ZaloPaySandboxService } = require('../src/modules/payments/zalopay-sandbox.service');

/**
 * Task 10 (b): gửi 2 lần cùng Idempotency-Key chỉ tạo 1 giao dịch.
 * Dùng Prisma giả để test không cần kết nối PostgreSQL.
 */
function setup() {
  const order = { id: 'o1', userId: 'u1', status: 'PENDING', finalAmount: 45000, orderNumber: 1042 };
  const rows = new Map();
  const state = { creates: 0, gatewayCalls: 0, hideCommittedRow: false };

  const toRow = (row) => row && { ...row, order: { userId: order.userId, orderNumber: order.orderNumber } };
  const findRow = (where, hideCommitted = false) => {
    if (where.idempotencyKey) {
      if (hideCommitted && state.hideCommittedRow) return null;
      return rows.get(where.idempotencyKey) ?? null;
    }
    if (where.id) return [...rows.values()].find((row) => row.id === where.id) ?? null;
    return null;
  };

  const tx = {
    $queryRaw: async () => [],
    order: { findUnique: async () => order },
    payment: {
      findUnique: async ({ where }) => toRow(findRow(where, true)),
      findFirst: async () => null,
      create: async ({ data }) => {
        state.creates += 1;
        if (rows.has(data.idempotencyKey)) {
          throw new Prisma.PrismaClientKnownRequestError('duplicate idempotency key', { code: 'P2002', clientVersion: '6.19.3' });
        }
        const row = { id: `p${state.creates}`, ...data };
        rows.set(data.idempotencyKey, row);
        return toRow(row);
      },
    },
  };

  const prisma = {
    payment: {
      findUnique: async ({ where }) => toRow(findRow(where)),
      update: async ({ where, data }) => {
        const row = findRow(where);
        Object.assign(row, data);
        return { ...row };
      },
      updateMany: async () => ({ count: 0 }),
    },
    $transaction: async (fn) => fn(tx),
  };

  const gateway = {
    assertReady() {},
    async create() {
      state.gatewayCalls += 1;
      return { accepted: true, paymentUrl: 'https://sandbox.zalopay/pay' };
    },
  };

  const service = new ZaloPaySandboxService(prisma, { transition: async () => {} }, gateway, { isAdmin: async () => false });
  return { service, order, rows, state };
}

test('the same Idempotency-Key returns the recorded payment instead of charging twice', async () => {
  const { service, state } = setup();
  const payload = { orderId: 'o1', method: 'E_WALLET' };

  const first = await service.create('u1', payload, 'key-1');
  const second = await service.create('u1', payload, 'key-1');

  assert.equal(first.id, second.id);
  assert.equal(state.creates, 1);
  assert.equal(state.gatewayCalls, 1);
});

test('the same Idempotency-Key with a different payload is rejected', async () => {
  const { service, state } = setup();

  await service.create('u1', { orderId: 'o1', method: 'E_WALLET' }, 'key-2');
  await assert.rejects(
    service.create('u1', { orderId: 'o1', method: 'BANK_CARD' }, 'key-2'),
    { status: 409 },
  );

  assert.equal(state.creates, 1);
  assert.equal(state.gatewayCalls, 1);
});

test('concurrent requests with the same Idempotency-Key replay the stored payment instead of failing', async () => {
  const { service, state } = setup();
  const payload = { orderId: 'o1', method: 'E_WALLET' };

  const first = await service.create('u1', payload, 'key-3');
  // Lần đọc trong transaction không thấy bản ghi vì request khác vừa ghi xong → nhánh bắt P2002.
  state.hideCommittedRow = true;
  const second = await service.create('u1', payload, 'key-3');

  assert.equal(first.id, second.id);
  assert.equal(state.creates, 2); // 1 lần tạo thật + 1 lần bị unique index chặn
  assert.equal(state.gatewayCalls, 1);
});