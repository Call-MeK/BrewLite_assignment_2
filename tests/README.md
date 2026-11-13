# Kiểm thử end-to-end

Thư mục này chứa test E2E chạy trên một stack thật, đúng yêu cầu Task 5.2
("ít nhất một end-to-end test cho luồng từ menu đến xác nhận đơn").

| Loại test | Vị trí | Chạy khi |
|---|---|---|
| Unit (frontend) | `apps/web/tests/` | `npm test` trong `apps/web` |
| Unit + integration (backend) | `apps/api/test/` | `npm test` trong `apps/api` (cần `PAYMENT_TEST_DATABASE_URL`) |
| End-to-end | `tests/e2e/` | `node --test tests/e2e/checkout-flow.test.mjs` với `E2E_API_URL` |

## Chạy E2E

```powershell
# 1. Dựng stack local
docker compose up -d
cd apps/api; npx prisma migrate deploy; npx prisma db seed; cd ../..

# 2. Chạy E2E
$env:E2E_API_URL = 'http://localhost:4000/api/v1'
node --test tests/e2e/checkout-flow.test.mjs
```

Không đặt `E2E_API_URL` thì E2E tự bỏ qua (skipped), nên CI và máy chưa dựng stack
vẫn chạy được mà không đỏ.

Test tạo một tài khoản mới, đặt 1 đơn rồi huỷ để hoàn tồn kho. Chỉ trỏ vào môi
trường có thể xoá dữ liệu (local hoặc production demo đã seed).