# Test Cases – Payment v2.0 (ZaloPay Sandbox)

## 1. Phạm vi

Kiểm thử `POST /api/v1/payments/zalopay`, callback, đồng bộ trạng thái, hủy giao dịch,
hai phương thức `E_WALLET` / `BANK_CARD` và quy tắc `Idempotency-Key`. Không còn Mock
Payment Gateway.

## 2. Test Cases

| ID | Trường hợp kiểm thử | Kết quả mong đợi |
|---|---|---|
| TC-PAY-01 | Tạo giao dịch ví ZaloPay khi sandbox đã cấu hình | Payment `PENDING`, có `paymentUrl` https thuộc miền ZaloPay, Order giữ `PENDING` |
| TC-PAY-02 | Tạo giao dịch thẻ nội địa | Payment `PENDING`, `method = BANK_CARD` |
| TC-PAY-03 | Callback hợp lệ (MAC đúng, đủ tiền) | Payment `SUCCESS`, Order `PAID`, cộng điểm một lần |
| TC-PAY-04 | `sync` thấy ZaloPay báo thành công | Payment `SUCCESS`, Order `PAID` |
| TC-PAY-05 | `sync` thấy ZaloPay hết hạn (`-54`) sau `expiresAt` | Payment `FAILED`, Order `PAYMENT_FAILED` |
| TC-PAY-06 | `sync` gặp mã lỗi truy vấn/timeout | HTTP `503`, không đổi trạng thái |
| TC-PAY-07 | Callback sai MAC | HTTP 200 `return_code: -1`, không đổi dữ liệu |
| TC-PAY-08 | Callback sai `app_id` / `app_trans_id` | HTTP 200 `return_code: -1`, không đổi dữ liệu |
| TC-PAY-09 | Callback lặp cùng giao dịch | Vẫn `SUCCESS`, không cộng điểm lần hai |
| TC-PAY-10 | Số tiền callback khác đơn | Payment `SUCCESS` + `reviewReason`, Order không chuyển `PAID` |
| TC-PAY-11 | Callback đến sau khi đơn đã hủy | Payment `SUCCESS` + `reviewReason`, cần admin xử lý |
| TC-PAY-12 | Thiếu `orderId` / `method` / method sai | `400 Bad Request` |
| TC-PAY-13 | Client gửi `amount` trong body | `400`; số tiền chỉ lấy từ `Order.finalAmount` |
| TC-PAY-14 | Order không tồn tại | `404`, không gọi ZaloPay |
| TC-PAY-15 | User khác thanh toán đơn | `403` |
| TC-PAY-16 | Order đã `PAID` / `CANCELLED` | `409` |
| TC-PAY-17 | Cùng key + cùng payload | Trả bản ghi đã lưu, không tạo giao dịch mới |
| TC-PAY-18 | Cùng key + payload khác | `409 Conflict` |
| TC-PAY-19 | Hai request đồng thời cùng key | Một bản ghi; request thua trả kết quả đã lưu, không `500` |
| TC-PAY-20 | Key mới khi đơn đang có payment `PENDING`/`SUCCESS` | `409`, không mở lượt thứ hai |
| TC-PAY-21 | Sandbox chưa bật/thiếu cấu hình | `503`, không tạo Payment, Order không đổi |
| TC-PAY-22 | Hủy giao dịch `PENDING` được ZaloPay xác nhận | Payment `FAILED`, Order `PAYMENT_FAILED`, cho phép tạo lượt mới |
| TC-PAY-23 | Hủy giao dịch nhưng ZaloPay không xác nhận | Payment giữ `PENDING`, trả `503` |
| TC-PAY-24 | Hủy giao dịch của user khác | `403` |
| TC-PAY-25 | Lượt trước `FAILED`, lượt sau thành công | Order `PAYMENT_FAILED → PENDING → PAID`, giữ lịch sử các lượt |

## 3. Điều kiện nghiệm thu

- Mọi giao dịch mới có `source = ZALOPAY_SANDBOX`; không còn đường tạo payment mock.
- Trạng thái Payment và Order nhất quán; lỗi/hủy chuyển `PAYMENT_FAILED`, retry chuyển `PENDING`.
- Idempotency đúng với request lặp và request đồng thời (không crash `500`).
- Sandbox fail closed khi thiếu cấu hình hoặc chạy ngoài `development`/`test`.
- Không endpoint nào cho phép client tự quyết định số tiền hoặc kết quả thanh toán.
- Kết quả kiểm thử được ghi nhận Pass/Fail sau mỗi lần chạy.

## 4. Lịch sử thay đổi

- v2.0 (2026-11-13): Thay toàn bộ test case mock bằng ZaloPay Sandbox; thêm callback,
  sync, cancel và các mã lỗi truy vấn.
- v1.2 (2026-10-21): Bổ sung idempotency/concurrency cho mock gateway.
- v1.0 (2026-10-11): Khởi tạo danh mục Test Cases Payment.
