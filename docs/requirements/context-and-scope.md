# Bối cảnh và phạm vi – BrewLite

## 1. Bối cảnh

Các quán cà phê nhỏ thường nhận đơn qua nhiều kênh rời rạc (lời nói, tin nhắn, sổ tay) và
thu tiền mặt. Cách làm này dễ sai sót khi đông khách, khó theo dõi tồn kho nguyên liệu và
không có dữ liệu để đối soát doanh thu.

BrewLite là ứng dụng web đặt cà phê **không dùng tiền mặt** cho một quán duy nhất:

- Khách xem menu, tùy chọn size/topping, thêm vào giỏ và đặt hàng.
- Khách thanh toán qua **ZaloPay Sandbox** (Ví ZaloPay hoặc thẻ nội địa).
- Nhân viên/quản trị theo dõi đơn, tồn kho nguyên liệu, công thức và giao dịch.
- Hệ thống kiểm soát tồn kho, điểm loyalty và khuyến mãi trong cùng transaction với đơn hàng.

## 2. Mục tiêu

| Mục tiêu | Cách đo |
|---|---|
| Đặt hàng trực tuyến end-to-end | Khách hoàn tất đơn từ menu đến `PAID` không cần tiền mặt |
| Không bán vượt tồn kho | Hai đơn đồng thời chỉ một đơn thành công khi nguyên liệu chỉ đủ một phần |
| Thanh toán có thể kiểm chứng | Mọi giao dịch có mã ZaloPay, MAC callback hợp lệ, đối soát được |
| Vận hành minh bạch | Admin xem được đơn, giao dịch, tồn kho và lịch sử trạng thái |
| Chất lượng mã nguồn | Build + test chạy tự động trên `main` qua GitHub Actions |

## 3. Actor

| Actor | Quyền chính |
|---|---|
| Khách vãng lai | Xem menu, chi tiết sản phẩm, đăng ký/đăng nhập |
| Khách hàng | Giỏ hàng, đặt hàng, thanh toán, hủy đơn chờ, xem lịch sử đơn, dùng điểm |
| Quản trị viên | Quản lý sản phẩm/công thức/kho, cập nhật trạng thái đơn, đối soát thanh toán, quản lý người dùng |
| ZaloPay Sandbox | Tạo giao dịch, callback kết quả, trả trạng thái khi truy vấn |

## 4. Phạm vi chức năng

### Trong phạm vi

1. **Product Catalog** – danh sách, tìm kiếm, lọc theo danh mục.
2. **Product Detail** – size, topping, giá tùy chọn, tồn kho khả dụng.
3. **Cart** – thêm/sửa/xóa, tính tiền, lưu cục bộ, giữ giỏ khi thanh toán lỗi.
4. **Auth** – đăng ký, đăng nhập JWT, đổi mật khẩu, phân quyền `CUSTOMER`/`ADMIN`.
5. **Order** – tạo đơn, snapshot giá, state machine, hủy và hoàn kho/điểm.
6. **Payment** – ZaloPay Sandbox, callback, đồng bộ, hủy, idempotency, đối soát.
7. **Order History** – danh sách và chi tiết đơn của khách.
8. **Admin** – sản phẩm, nguyên liệu, công thức, nhập kho, đơn hàng, thanh toán, người dùng.
9. **Promotion & Loyalty** – mã giảm giá, tích/đổi điểm, hoàn điểm khi hủy.

### Ngoài phạm vi

- Thanh toán tiền thật, hoàn tiền tự động qua ngân hàng.
- Ứng dụng mobile native, đặt món tại bàn bằng QR, giao hàng.
- Đa chi nhánh, đa ngôn ngữ, đa tiền tệ.
- Chat, thông báo push/email/SMS.
- Đồng bộ POS hoặc kế toán bên thứ ba.
- Mock payment: đã bị gỡ; `PaymentSource.MOCK` chỉ còn để đọc dữ liệu lịch sử.

## 5. Ràng buộc

- **Kỹ thuật:** NestJS 11 + Prisma 6 + PostgreSQL 16; Next.js 15 App Router; Node.js 22.
- **Thanh toán:** chỉ ZaloPay Sandbox, bật bằng `ZALOPAY_SANDBOX_ENABLED=true` trong
  `development`/`test`. Production thật cần bổ sung luồng merchant chính thức.
- **Triển khai:** frontend và backend tách tiến trình; backend cần tiến trình chạy dài
  vì có cron dọn đơn hết hạn, không phù hợp serverless thuần.
- **Dữ liệu:** mọi thay đổi tồn kho/điểm/trạng thái đơn phải nằm trong transaction.
- **Thời gian:** đồ án học kỳ I 2026–2027; nhóm 4 thành viên; ưu tiên luồng đặt món hoàn chỉnh.

## 6. Giả định

- Một quán, một kho nguyên liệu dùng chung cho mọi sản phẩm.
- Mỗi đơn thuộc đúng một khách hàng; khách tự hủy khi đơn chưa vào pha chế.
- ZaloPay Sandbox là môi trường kiểm thử; không phát sinh tiền thật.
- Quản trị viên được cấu hình qua `PAYMENT_ADMIN_USER_IDS` cho nghiệp vụ thanh toán.
