# Đặc tả yêu cầu phần mềm (SRS) – BrewLite

Tài liệu này tóm tắt yêu cầu chức năng, phi chức năng và ràng buộc của BrewLite. Mã yêu cầu
được dùng lại trong [ma trận truy vết](../traceability-matrix.md), [use-case trọng tâm](use-case-uc01.md)
và [kịch bản kiểm thử](../test-scenarios/test-scenarios.md).

**Mức ưu tiên (MoSCoW):** `Must` = bắt buộc cho MVP · `Should` = nên có · `Could` = có thì tốt ·
`Won't` = không làm trong đồ án. Mỗi yêu cầu có tiêu chí chấp nhận (AC) kiểm chứng được và được
truy vết ở mục 8 của báo cáo.

## 1. Yêu cầu chức năng

### FR-01 – Menu sản phẩm

- Hiển thị sản phẩm đang bán kèm ảnh, giá từ, danh mục, trạng thái còn hàng.
- Tìm kiếm theo tên (không phân biệt hoa/thường, có dấu/không dấu) và lọc theo danh mục.
- Chỉ hiển thị sản phẩm còn đủ nguyên liệu cho ít nhất một size.
- **Ưu tiên:** Must
- **AC:** `GET /products` trả ≥ 8 sản phẩm đang bán; từ khoá `ca phe` và `cà phê` cho cùng tập
  kết quả; lọc danh mục chỉ trả món thuộc danh mục đó; món hết nguyên liệu ở mọi size không xuất hiện.

### FR-02 – Chi tiết sản phẩm và tùy chọn

- Hiển thị mô tả, thành phần, size và topping kèm giá cộng thêm.
- Tính giá theo `size + topping`; chặn chọn size/topping đã hết nguyên liệu.
- Số lượng mỗi dòng từ 1 đến 99.
- **Ưu tiên:** Must
- **AC:** đổi size/topping cập nhật giá ngay trước khi thêm vào giỏ; size hết nguyên liệu bị vô hiệu;
  số lượng ngoài 1–99 bị chặn; dòng thêm vào giỏ giữ đúng `product + size + topping`.

### FR-03 – Giỏ hàng

- Thêm/sửa/xóa dòng hàng; gộp dòng trùng `product + size + topping`.
- Tính tạm tính, giảm giá, điểm sử dụng và tổng cuối cùng.
- Lưu giỏ cục bộ; **không** xóa giỏ khi tạo đơn hoặc thanh toán lỗi.
- Chỉ xóa giỏ và `pendingOrderId` khi đơn đạt `PAID`.
- **Ưu tiên:** Must
- **AC:** tải lại trang giữ nguyên giỏ; tổng tiền = tạm tính − voucher − điểm; tạo đơn thất bại
  hoặc thanh toán lỗi vẫn còn giỏ; giỏ chỉ rỗng sau khi đơn `PAID`.

### FR-04 – Xác thực và phân quyền

- Đăng ký/đăng nhập bằng email + mật khẩu; mật khẩu băm bcrypt.
- JWT có `sub`, `email`, `ver`; đổi mật khẩu làm tăng `ver` và vô hiệu token cũ.
- Route khách hàng yêu cầu JWT; route admin yêu cầu role `ADMIN`.
- Không tin `userId` do client gửi; luôn lấy từ JWT.
- **Ưu tiên:** Must
- **AC:** thiếu/sai token trả `401`; role `USER` gọi route admin trả `403`; token cũ bị từ chối sau
  khi đổi mật khẩu; mật khẩu không xuất hiện trong response.

### FR-05 – Tạo đơn và thanh toán

- `POST /orders` kiểm tra tồn kho, snapshot giá, trừ nguyên liệu và tạo đơn `PENDING`.
- Thanh toán qua `POST /payments/zalopay`; backend tự lấy `finalAmount` từ đơn.
- Callback/`sync` thành công chuyển đơn `PAID`, cộng điểm một lần.
- Thất bại/hủy chuyển `PAYMENT_FAILED`; khách thử lại không giới hạn với key mới.
- **Ưu tiên:** Must
- **AC:** đơn tạo trong transaction và trả `201` với `status = PENDING`; `finalAmount` do server tính,
  client gửi sai bị bỏ qua; callback thành công cộng điểm đúng một lần; thất bại cho phép retry.

### FR-06 – Xác nhận và lịch sử đơn

- Khách xem danh sách đơn (phân trang) và chi tiết đơn của mình.
- Chi tiết gồm dòng hàng, topping, giảm giá, điểm, trạng thái và mã giao dịch.
- Khách khác không xem được đơn (trả `404` để không lộ sự tồn tại).
- **Ưu tiên:** Must
- **AC:** khách chỉ thấy đơn thuộc `userId` của mình; truy cập đơn người khác trả `404`; chi tiết đủ
  dòng hàng, giảm giá, điểm, trạng thái, mã giao dịch; danh sách phân trang.

### FR-07 – Order State Machine

- Trạng thái: `PENDING → PAID → PREPARING → READY → COMPLETED`.
- Nhánh lỗi: `PENDING → PAYMENT_FAILED → PENDING` khi thử lại; `PENDING/PAYMENT_FAILED → CANCELLED`.
- Chỉ chuyển tiếp hợp lệ; dùng optimistic locking (`version`) để chống ghi đè.
- Hủy đơn hoàn nguyên liệu và hoàn điểm đã dùng đúng một lần; đơn đã `PAID` cần đối soát
  hoàn tiền thủ công (`refundStatus = MANUAL_REQUIRED`).
- **Ưu tiên:** Must
- **AC:** chuyển sai thứ tự trả `409`; bảy trạng thái và bảng chuyển tiếp tường minh; hai request
  đồng thời không ghi đè trạng thái; hủy đơn hoàn kho/điểm đúng một lần.

### FR-08 – Thanh toán idempotent

- `Idempotency-Key` bắt buộc, 1–255 ký tự.
- Cùng key + cùng payload trả kết quả đã lưu; khác payload trả `409`.
- Request đồng thời không tạo hai giao dịch và không trả `500`.
- Chỉ một giao dịch `PENDING`/`SUCCESS` cho mỗi đơn tại một thời điểm.
- **Ưu tiên:** Must
- **AC:** thiếu key trả `400`; lặp key + payload trả lại giao dịch cũ; khác payload trả `409`; hai
  request song song chỉ sinh một giao dịch.

### FR-09 – Kiểm soát tồn kho

- Trừ nguyên liệu theo công thức của size; kiểm tra `stock >= quantity` trong transaction.
- Hai đơn đồng thời không được bán vượt tồn kho; tồn kho không âm.
- Hủy đơn hoàn đúng lượng nguyên liệu đã trừ.
- **Ưu tiên:** Must
- **AC:** chạy hai đơn tranh chấp cùng nguyên liệu chỉ một đơn thành công; tồn kho không âm; hủy đơn
  hoàn đúng lượng đã trừ theo ảnh chụp định lượng.

### FR-10 – Khuyến mãi và loyalty

- Mã giảm giá có điều kiện giá trị đơn, thời hạn và số lần dùng.
- Tích điểm `floor(finalAmount / 1000)` khi đơn `PAID`.
- Đổi điểm khi đặt hàng; hủy đơn hoàn điểm đã dùng và thu hồi điểm đã tích.
- **Ưu tiên:** Should
- **AC:** voucher sai điều kiện bị từ chối kèm lý do; điểm cộng đúng công thức và chỉ một lần mỗi đơn;
  hủy đơn hoàn điểm đã dùng và trừ điểm đã tích.

### FR-11 – Quản trị

- Quản lý sản phẩm, size, topping, công thức, nguyên liệu, nhập kho.
- Cập nhật trạng thái đơn theo thứ tự; xem và hủy đơn khi cần.
- Đối soát thanh toán: lọc theo nguồn/trạng thái/ngày, xem chi tiết, đồng bộ ZaloPay.
- Quản lý người dùng và role.
- **Ưu tiên:** Should
- **AC:** admin CRUD được sản phẩm/kho/công thức; chuyển trạng thái đơn đúng luật; bảng đối soát lọc
  theo nguồn/trạng thái/ngày; đồng bộ lại trạng thái từ ZaloPay.

### FR-12 – Thông báo và phản hồi trạng thái

- Mỗi thao tác (thêm giỏ, đặt đơn, thanh toán, đổi trạng thái) có phản hồi thành công/thất bại rõ ràng.
- Đơn đang chờ thanh toán tự cập nhật trạng thái định kỳ.
- **Ưu tiên:** Could
- **AC:** mọi lỗi hiển thị thông điệp tiếng Việt, không lộ stack trace; trang đơn chờ tự làm mới
  mỗi 15 giây.

## 2. Yêu cầu phi chức năng

| Mã | Yêu cầu | MoSCoW | Tiêu chí chấp nhận |
|---|---|---|---|
| NFR-01 | Hiệu năng | Must | API đọc dữ liệu mẫu phản hồi < 500 ms (đo trên production: trung vị 96–182 ms) |
| NFR-02 | Bảo mật | Must | JWT, bcrypt, phân quyền, validate DTO, không lộ chi tiết lỗi nội bộ, ZaloPay MAC so sánh timing-safe |
| NFR-03 | Tương thích | Must | Chrome/Edge/Firefox/Safari bản mới; layout responsive từ 360 px, không cuộn ngang |
| NFR-04 | Toàn vẹn dữ liệu | Must | Transaction cho đơn/tồn kho/điểm/thanh toán; unique key chống trùng |
| NFR-05 | Khả dụng | Must | Trạng thái loading/empty/error rõ ràng; thao tác nguy hiểm có xác nhận |
| NFR-06 | Bảo trì | Must | TypeScript strict, module hóa theo feature, tài liệu API/DB/ADR trong `docs/` |
| NFR-07 | Kiểm thử | Must | Build + unit/integration test chạy trong CI trên `main`, chặn merge khi lỗi |
| NFR-08 | Cấu hình | Must | Không commit secret; mọi cấu hình qua biến môi trường, có `.env.example` |
| NFR-09 | Khả năng triển khai | Should | Chạy được bằng `docker compose up`; frontend/API production truy cập qua HTTPS; có `/health` |

## 3. Ràng buộc và giả định

- Thanh toán chỉ ở mức **sandbox**; không xử lý tiền thật.
- Backend có cron mỗi phút để hủy đơn quá hạn, nên cần môi trường chạy dài (container/VM).
- Callback ZaloPay cần URL HTTPS công khai; nếu không có, hệ thống dùng polling.
- Dữ liệu lịch sử có thể còn bản ghi `MOCK`; giao diện gắn nhãn "lưu trữ" và không tạo mới.
- Đồ án không bao gồm SLA, đa chi nhánh hay tích hợp ngân hàng thật.

## 4. Tiêu chí nghiệm thu tổng thể

1. Khách hoàn tất một đơn từ menu đến `PAID` qua ZaloPay Sandbox.
2. Không bán vượt tồn kho khi đặt đồng thời.
3. Retry thanh toán và callback lặp không tạo giao dịch/điểm trùng.
4. Admin đối soát được mọi giao dịch và trạng thái đơn.
5. `npm run build` ở `apps/api`, `apps/web` và `npm test` ở backend chạy thành công trong CI.
