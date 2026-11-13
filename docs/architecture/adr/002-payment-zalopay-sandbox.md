# ADR-002: ZaloPay Sandbox là cổng thanh toán duy nhất

- **Trạng thái:** Đã chấp nhận (thay thế quyết định dùng mock payment)
- **Ngày:** 2026-11-13
- **Người quyết định:** Nhóm BrewLite

## Bối cảnh

Phiên bản trước có hai luồng thanh toán song song:

1. `MockPaymentGatewayService`: giả lập thành công/thất bại qua header `X-Mock-Outcome`,
   chỉ bật khi `NODE_ENV=development|test` và `PAYMENT_DEMO_MODE=true`.
2. `ZaloPaySandboxService`: tạo giao dịch thật ở mức sandbox, có callback, query, cancel,
   chữ ký HMAC và đối soát.

Mock giúp demo nhanh nhưng tạo hai nguồn sự thật: không kiểm chứng được callback/MAC, không
thể hiện đúng vòng đời giao dịch, và làm tài liệu/test bị chia đôi. Rubric cho phép mô phỏng
thanh toán, nhưng nhóm cần một luồng duy nhất phản ánh hành vi cổng thanh toán thật.

## Quyết định

**Gỡ toàn bộ mock payment.** ZaloPay Sandbox là cổng duy nhất:

- Xóa `MockPaymentGatewayService`, `PaymentsController`, `PaymentsService` và các test mock.
- `POST /api/v1/payments` không còn tồn tại; thay bằng `POST /api/v1/payments/zalopay`.
- Xóa `PAYMENT_DEMO_MODE` khỏi `.env.example`, `docker-compose.yml`, Postman và tài liệu.
- `PaymentSource.MOCK` vẫn giữ trong enum để đọc bản ghi lịch sử; không có đường tạo mới.
- `Payment.source` mặc định chuyển từ `MOCK` sang `ZALOPAY_SANDBOX`.
- Frontend chỉ còn panel `ZaloPaySandboxPanel`; admin chỉ lọc theo ZaloPay.

## Hệ quả

**Tích cực**

- Một luồng thanh toán duy nhất, dễ hiểu và dễ bảo trì.
- Kiểm thử được chữ ký callback, số tiền, giao dịch trùng và trạng thái không xác định.
- Tài liệu, Postman và UI khớp nhau.

**Tiêu cực**

- Demo cần cấu hình ZaloPay Sandbox; nếu thiếu cấu hình, API trả `503` thay vì cho phép
  thanh toán giả lập.
- Không thể chạy toàn bộ luồng thanh toán trong CI vì test không gọi mạng; CI phủ logic
  qua service/gateway giả.
- Dữ liệu lịch sử có thể còn bản ghi `MOCK`; giao diện gắn nhãn "lưu trữ".

## Phương án đã cân nhắc

1. **Giữ mock làm fallback khi thiếu cấu hình:** tiện demo nhưng tái lập hai nguồn sự thật và
   có nguy cơ bật nhầm ở production. Bị loại.
2. **Dùng cổng khác (MoMo/VNPay) thay ZaloPay:** MoMo đã bị gỡ trước đó; ZaloPay Sandbox đã
   tích hợp và có tài liệu. Không cần thêm cổng thứ hai.

## Tuân thủ rubric

Rubric Assignment 2 yêu cầu “thanh toán Ví/Thẻ mô phỏng”. ZaloPay Sandbox đáp ứng tinh thần
đó ở mức **sandbox có kiểm chứng** (không dùng tiền thật) và bao phủ nhiều tình huống hơn mock.
Đánh đổi được ghi rõ trong `docs/traceability-matrix.md` mục 5.
