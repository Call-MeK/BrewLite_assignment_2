# API Contract – Payment v2.0 (ZaloPay Sandbox)

> Phạm vi: thanh toán chạy hoàn toàn qua **ZaloPay Sandbox**. Mock payment đã bị gỡ khỏi
> backend, frontend và Postman. `PaymentSource.MOCK` chỉ còn trong enum để đọc các bản ghi
> lịch sử; mọi giao dịch mới đều có `source = "ZALOPAY_SANDBOX"`.
>
> Không có tiền thật. ZaloPay Sandbox chỉ chấp nhận `NODE_ENV=development|test`,
> `ZALOPAY_SANDBOX_ENABLED=true` và bộ `ZALOPAY_APP_ID` / `ZALOPAY_KEY1` / `ZALOPAY_KEY2`.

## 1. Danh sách endpoint

| Method | URL | Auth | Mục đích |
|---|---|---|---|
| `GET` | `/api/v1/payments/zalopay/config` | Bearer | Kiểm tra sandbox đã bật và đủ cấu hình |
| `POST` | `/api/v1/payments/zalopay` | Bearer | Tạo giao dịch và lấy `paymentUrl` |
| `GET` | `/api/v1/payments/zalopay/orders/:orderId` | Bearer | Lấy giao dịch ZaloPay mới nhất của đơn |
| `GET` | `/api/v1/payments/zalopay/:id` | Bearer | Lấy một giao dịch |
| `POST` | `/api/v1/payments/zalopay/:id/sync` | Bearer | Truy vấn ZaloPay và cập nhật trạng thái |
| `POST` | `/api/v1/payments/zalopay/:id/cancel` | Bearer | Hủy giao dịch đang chờ để đổi phương thức |
| `POST` | `/api/v1/payments/zalopay/callback` | Public + MAC | Webhook xác nhận thanh toán của ZaloPay |

Response của các endpoint có JWT được bọc bởi `TransformInterceptor`
(`{ success, statusCode, data, timestamp }`). Riêng callback trả đúng định dạng ZaloPay
(`return_code`, `return_message`) và không dùng envelope.

## 2. Tạo giao dịch

```http
POST /api/v1/payments/zalopay
Authorization: Bearer <access_token>
Content-Type: application/json
Idempotency-Key: 3f0f6f47-1b1d-4a2e-9c4b-8f0f2f4f9a11
```

```json
{
  "orderId": "cm3order001",
  "method": "E_WALLET"
}
```

- `method`: `E_WALLET` (Ví ZaloPay) hoặc `BANK_CARD` (thẻ nội địa).
- `orderId` lấy từ đơn hàng vừa tạo; backend đọc `finalAmount` từ database, không nhận
  `amount` từ client.
- `Idempotency-Key`: bắt buộc, 1–255 ký tự, không toàn khoảng trắng.
- Trường ngoài DTO (`amount`, `userId`, …) bị từ chối `400`.

**`201 Created`** khi tạo mới, **`200 OK`** khi replay cùng key:

```json
{
  "success": true,
  "statusCode": 201,
  "data": {
    "id": "cmpayment001",
    "orderId": "cm3order001",
    "source": "ZALOPAY_SANDBOX",
    "status": "PENDING",
    "amount": 65000,
    "method": "E_WALLET",
    "paymentUrl": "https://sbcheckout.zalopay.vn/...",
    "providerOrderId": "261113_9f1c...",
    "reference": null,
    "providerAmount": null,
    "reviewReason": null,
    "failureReason": null,
    "expiresAt": "2026-11-13T12:15:00.000Z",
    "createdAt": "2026-11-13T12:00:00.000Z"
  },
  "timestamp": "2026-11-13T12:00:00.000Z"
}
```

Backend ghi bản ghi `PENDING` **trước** khi gọi ZaloPay để một kết quả không xác định
không thể mở thêm lượt thanh toán thứ hai. Nếu ZaloPay không phản hồi, payment vẫn
`PENDING` kèm `failureReason` hướng dẫn đồng bộ; client gọi `sync` trước khi thử lại.

## 3. Vòng đời trạng thái

| Payment | Order | Ý nghĩa |
|---|---|---|
| `PENDING` | `PENDING` | Đã tạo, chờ khách thanh toán trên ZaloPay |
| `SUCCESS` | `PAID` | ZaloPay xác nhận qua callback hoặc query |
| `FAILED` | `PAYMENT_FAILED` | ZaloPay từ chối/hủy hoặc khách đổi phương thức |
| `SUCCESS` + `reviewReason` | không đổi | Có bất thường (sai tiền, trùng giao dịch, đơn đã hủy) — cần admin kiểm tra |

- Chỉ chuyển `PAID` khi số tiền ZaloPay trả về khớp `Payment.amount` **và**
  `Order.finalAmount`, đồng thời đơn chưa bị hủy và không có lượt thanh toán khác.
- Xác nhận muộn cho đơn `PAYMENT_FAILED` được chuyển `PAYMENT_FAILED → PENDING → PAID`
  trong cùng transaction.
- Điểm loyalty được cộng một lần bởi `OrdersService.transition(..., PAID, ...)`.

## 4. Đồng bộ trạng thái

`POST /api/v1/payments/zalopay/:id/sync` gọi API query của ZaloPay:

- Thành công → payment `SUCCESS`, order `PAID`.
- `return_code = 2`, `sub_return_code = -54`, hết `expiresAt` → payment `FAILED`,
  order `PAYMENT_FAILED`.
- Các mã lỗi truy vấn (`-92`, `-401`, `-402`, `-429`, `-500`, `-999`) hoặc timeout
  → `503`, **không** kết luận thanh toán thất bại.
- Payment đã `SUCCESS` trả lại nguyên trạng thái, không gọi ZaloPay lần nữa.

Frontend tự gọi `sync` mỗi 15 giây khi tab đang mở và khi quay lại tab.

## 5. Callback

`POST /api/v1/payments/zalopay/callback` nhận body `{ data, mac, type }` của ZaloPay:

1. Xác thực `mac = HMAC-SHA256(key2, data)` bằng so sánh timing-safe.
2. `type` (nếu có) phải bằng `1`; `app_id` phải khớp cấu hình.
3. `app_trans_id` phải khớp giao dịch đã lưu.
4. Áp dụng cùng quy tắc settle như `sync`.
5. Trả `{ "return_code": 1, "return_message": "success" }` để ZaloPay ngừng retry.
   Callback sai định dạng trả HTTP 200 với `return_code: -1`; lỗi hạ tầng trả
   `return_code: 0` để ZaloPay gửi lại.

Callback là **tùy chọn**. Nếu `ZALOPAY_CALLBACK_URL` trống, backend tạo giao dịch không
kèm `callback_url` và trạng thái được cập nhật bằng polling.

## 6. Hủy và đổi phương thức

`POST /api/v1/payments/zalopay/:id/cancel` chỉ dành cho chủ đơn và payment `PENDING`.
Backend gọi API cancel của ZaloPay trước; chỉ khi ZaloPay xác nhận (`return_code = 1`)
mới chuyển payment `FAILED` và order `PAYMENT_FAILED`. Nếu hủy không xác định, giao dịch
giữ nguyên `PENDING` để khách kiểm tra lại — không tạo lượt mới dựa trên giả định đã hủy.

## 7. Idempotency

- Cùng key + cùng `{ source, orderId, method }` → trả bản ghi đã lưu, không gọi ZaloPay lại.
- Cùng key + payload khác → `409 Conflict`.
- Request đồng thời cùng key: request thua unique constraint đọc lại và trả kết quả đã lưu.
- Key mới cho đơn đang có payment `PENDING`/`SUCCESS` → `409 Conflict`.
- Sau `PAYMENT_FAILED`, lần thử mới dùng key mới; backend tự chuyển đơn về `PENDING`.

## 8. Mã lỗi

| HTTP | Trường hợp | Thông điệp tiêu biểu |
|---|---|---|
| `400` | DTO sai, thiếu `orderId`/`method`, `finalAmount <= 0` | `["method must be a valid enum value"]` |
| `401` | Thiếu hoặc sai JWT | `"Unauthorized"` |
| `403` | Đơn/giao dịch của user khác | `"Bạn không có quyền thanh toán đơn hàng này"` |
| `404` | Không tìm thấy đơn hoặc giao dịch ZaloPay | `"Không tìm thấy giao dịch ZaloPay"` |
| `409` | Đơn không còn chờ thanh toán, đã có giao dịch active, key lệch payload | `"Đơn hàng đã thanh toán hoặc đang được xử lý"` |
| `503` | Sandbox chưa bật/thiếu cấu hình, ZaloPay timeout | `"ZaloPay Sandbox chưa được bật hoặc cấu hình chưa đầy đủ"` |
| `500` | Lỗi không mong muốn | `"Đã xảy ra lỗi không mong muốn"` |

Khi sandbox chưa cấu hình, `GET /payments/zalopay/config` trả `{ "enabled": false }` và
`POST /payments/zalopay` trả `503` — không tạo payment, không đổi trạng thái đơn.

## 9. Cấu hình

```dotenv
NODE_ENV=development
ZALOPAY_SANDBOX_ENABLED=true
ZALOPAY_APP_ID=<app id sandbox>
ZALOPAY_KEY1=<key1>
ZALOPAY_KEY2=<key2>
# Tùy chọn: URL HTTPS công khai trỏ tới /api/v1/payments/zalopay/callback
ZALOPAY_CALLBACK_URL=
# Trang quay lại sau khi thanh toán; backend thêm /orders/:id/payment
ZALOPAY_REDIRECT_URL=http://localhost:3000
```

`ZALOPAY_SANDBOX_ENABLED=true` ngoài `development`/`test` vẫn bị từ chối (fail closed).

## 10. Kiểm thử

```powershell
cd apps/api
npm test                 # unit test ZaloPay + integration Orders (cần PostgreSQL)
npm run build
npx prisma validate
```

Test tích hợp dùng `PAYMENT_TEST_DATABASE_URL` trỏ tới schema PostgreSQL dùng một lần.
Không có test nào gọi mạng ZaloPay: gateway được thay bằng đối tượng giả trong unit test.

Kiểm tra thủ công bằng Postman: chạy collection `postman/collections/payment` theo thứ tự
health → register → login → products → product-detail → orders → payments. Request
`payments` gọi `POST /payments/zalopay` và dừng ở trạng thái `PENDING`; mở `paymentUrl`
trong trình duyệt để hoàn tất giao dịch sandbox, sau đó gọi `sync` (hoặc để callback/polling
tự cập nhật).

## 11. Lịch sử thay đổi

- v2.0 (2026-11-13): Gỡ Mock Payment Gateway và `PAYMENT_DEMO_MODE`; ZaloPay Sandbox là
  nguồn thanh toán duy nhất. Hợp đồng mô tả create/callback/sync/cancel thực tế.
- v1.2 (2026-10-21): Retry tự động, fail closed ở production, transaction/loyalty.
- v1.0 (2026-10-11): Khởi tạo hợp đồng API Payment.
