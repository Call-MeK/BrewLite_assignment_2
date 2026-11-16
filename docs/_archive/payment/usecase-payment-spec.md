# Use Case Specification – Payment (ZaloPay Sandbox)

## 1. Thông tin chung

- **Use Case ID:** UC-PAY-01
- **Tên Use Case:** Thanh toán đơn hàng qua ZaloPay Sandbox
- **Actor chính:** Khách hàng
- **Actor phụ:** ZaloPay Sandbox (cổng thanh toán thử nghiệm), Quản trị viên (đối soát)
- **Mục tiêu:** Cho phép khách hàng thanh toán đơn hàng bằng Ví ZaloPay hoặc thẻ nội địa
  trong môi trường sandbox và nhận kết quả giao dịch đã xác minh.

## 2. Tiền điều kiện (Preconditions)

- Khách hàng đã đăng nhập.
- Đơn hàng tồn tại, thuộc khách hàng và đang `PENDING` hoặc `PAYMENT_FAILED`.
- Sandbox đã bật: `ZALOPAY_SANDBOX_ENABLED=true`, `NODE_ENV=development|test`,
  `ZALOPAY_APP_ID`/`ZALOPAY_KEY1`/`ZALOPAY_KEY2` hợp lệ.
- Backend và cơ sở dữ liệu hoạt động bình thường.

## 3. Luồng chính (Main Flow)

1. Khách hàng mở trang thanh toán của đơn hàng.
2. Frontend gọi `GET /payments/zalopay/config` và
   `GET /payments/zalopay/orders/:orderId`.
3. Hệ thống hiển thị số tiền và lựa chọn `E_WALLET` / `BANK_CARD`.
4. Frontend gửi `POST /payments/zalopay` kèm `orderId`, `method`, `Idempotency-Key`.
5. Backend khóa đơn, kiểm tra quyền/trạng thái/key và ghi Payment `PENDING` trước khi gọi mạng.
6. Backend ký HMAC-SHA256 và gọi API create của ZaloPay Sandbox.
7. Backend trả `paymentUrl`; Frontend mở trang thanh toán ZaloPay.
8. Khách hoàn tất thanh toán sandbox.
9. ZaloPay gọi callback (nếu có `ZALOPAY_CALLBACK_URL`) hoặc Frontend gọi
   `POST /payments/zalopay/:id/sync`.
10. Backend xác thực MAC/số tiền, cập nhật Payment `SUCCESS` và chuyển Order `PAID`.
11. Hệ thống cộng điểm loyalty một lần và Frontend xóa giỏ hàng khi thấy `PAID`.

## 4. Luồng thay thế (Alternative Flows)

### A1 – Khách hủy hoặc giao dịch hết hạn

1. Khách bấm đổi phương thức hoặc ZaloPay báo hết hạn (`-54`) sau `expiresAt`.
2. Backend gọi API cancel (nếu đổi phương thức) và chỉ chuyển trạng thái khi ZaloPay xác nhận.
3. Payment `FAILED`, Order `PAYMENT_FAILED`.
4. Frontend giữ giỏ hàng; khách có thể tạo lượt mới với `Idempotency-Key` mới.

### A2 – Không xác định được kết quả

- Timeout hoặc mã lỗi truy vấn của ZaloPay trả `503`; Payment giữ `PENDING`.
- Khách chọn "Kiểm tra kết quả" (`sync`) trước khi thử lại. Hệ thống không tự kết luận thất bại
  và không cho tạo lượt thanh toán thứ hai khi lượt cũ còn `PENDING`.

### A3 – Callback bất thường

- MAC sai, `app_id` lạ hoặc dữ liệu hỏng: trả `return_code: -1`, không đổi dữ liệu.
- Số tiền lệch, giao dịch trùng hoặc đơn đã hủy: Payment `SUCCESS` kèm `reviewReason`,
  Order không chuyển `PAID`; Quản trị viên đối soát trong `/admin/payments`.

### A4 – Idempotency-Key đã tồn tại

- Cùng key + cùng payload: trả bản ghi đã lưu, không gọi ZaloPay lại.
- Cùng key + payload khác: `409 Conflict`.
- Request đồng thời: một bản ghi duy nhất, request thua đọc lại kết quả, không `500`.

## 5. Hậu điều kiện (Postconditions)

- Thành công: Payment `SUCCESS`, Order `PAID`, điểm loyalty cộng một lần, giỏ hàng được xóa.
- Thất bại: Payment `FAILED`, Order `PAYMENT_FAILED`, giỏ hàng giữ nguyên.
- Bất thường: Payment `SUCCESS` + `reviewReason`, Order giữ nguyên để admin xử lý.

## 6. Acceptance Criteria

- Chỉ ZaloPay Sandbox được dùng; không còn mock gateway hay `X-Mock-Outcome`.
- Backend tự xác định số tiền từ `Order.finalAmount`.
- Callback được xác thực MAC và đối chiếu `app_id`, `app_trans_id`, số tiền.
- Không tạo giao dịch trùng khi retry hoặc request đồng thời.
- Sandbox fail closed khi thiếu cấu hình hoặc chạy ngoài `development`/`test`.

---

## 7. Quy tắc nghiệp vụ (Business Rules)

| Mã quy tắc | Tên quy tắc | Nội dung chi tiết |
| :--- | :--- | :--- |
| **BR-PAY-01** | Idempotency | `Idempotency-Key` bắt buộc khi tạo giao dịch. Cùng key + cùng payload trả kết quả đã lưu; cùng key + payload khác trả `409`; request đồng thời không được trả `500`. |
| **BR-PAY-02** | Số tiền từ CSDL | `amount` luôn lấy từ `Order.finalAmount`; client không được gửi hoặc ghi đè số tiền. |
| **BR-PAY-03** | Điều kiện trạng thái | Chỉ nhận đơn `PENDING` hoặc `PAYMENT_FAILED`. Đơn khác trả `409`. |
| **BR-PAY-04** | Thanh toán thành công | Chỉ khi MAC/số tiền hợp lệ: Payment `SUCCESS`, Order `PAID`, ghi `paidAt`, lịch sử trạng thái và điểm loyalty trong cùng transaction. |
| **BR-PAY-05** | Thanh toán thất bại | ZaloPay từ chối/hủy/hết hạn: Payment `FAILED` + lý do, Order `PAYMENT_FAILED`, giữ giỏ hàng. |
| **BR-PAY-06** | Thử lại | Đơn `PAYMENT_FAILED` được chuyển về `PENDING` trong transaction tạo lượt mới; bắt buộc `Idempotency-Key` mới; không giới hạn số lần. |
| **BR-PAY-07** | Kết quả không xác định | Timeout hoặc mã lỗi truy vấn không được coi là thất bại; giữ `PENDING` và yêu cầu `sync`. |
| **BR-PAY-08** | Đối soát | Sai tiền, giao dịch trùng hoặc đơn đã hủy ghi `reviewReason`; Order không tự chuyển `PAID`; admin xử lý tại `/admin/payments`. |

## 8. Kết luận các vấn đề thiết kế

### [Q1] Khi nào chuyển đơn sang `PAYMENT_FAILED`?

- Khi ZaloPay xác nhận hủy/từ chối/hết hạn. Timeout và lỗi truy vấn **không** chuyển trạng thái.
- Khách được thử lại không giới hạn với key mới.

### [Q2] Thời gian chờ thanh toán

- Mỗi giao dịch có `expiresAt = createdAt + 15 phút` và gửi `expire_duration_seconds=900`
  sang ZaloPay. Chỉ khi ZaloPay xác nhận `-54` và đã quá `expiresAt` mới đóng giao dịch.
- Đơn bị bỏ dở vẫn giữ tồn kho cho đến khi khách hủy hoặc admin xử lý.

### [Q3] Vì sao bỏ mock payment?

- Rubric cho phép mô phỏng, nhưng mock tạo hai nguồn sự thật và không kiểm chứng được
  callback/MAC. ZaloPay Sandbox bao phủ đầy đủ luồng thật ở mức thử nghiệm nên mock bị gỡ.

## 9. Lịch sử thay đổi

- v2.0 (2026-11-13): ZaloPay Sandbox là luồng duy nhất; bổ sung callback, sync, cancel, đối soát.
- v1.1 (2026-10-16): Áp dụng quyết định D1, D2, D6.
- v1.0 (2026-10-11): Khởi tạo đặc tả Use Case Payment.
