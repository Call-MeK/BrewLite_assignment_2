# Use Case UC-01: Đặt và thanh toán đơn hàng

> Feature: Order + Payment | Phiên bản: v2.0 | Cập nhật: 16/11/2026
>
> Bản v1.x chỉ mô tả *tạo đơn*. Bản v2.0 gộp thêm nhánh thanh toán ZaloPay Sandbox để khớp
> với Task 1.3 của báo cáo Assignment 2 và với mã nguồn hiện tại
> (`apps/api/src/modules/orders/`, `apps/api/src/modules/payments/`).

## 1. Thông tin chung

| Mục | Nội dung |
|---|---|
| ID | UC-01 |
| Tên | Đặt và thanh toán đơn hàng |
| Actor chính | Khách hàng (`CUSTOMER` có Bearer JWT hợp lệ) |
| Actor phụ | ZaloPay Sandbox; Hệ thống (cron hủy đơn quá hạn); PostgreSQL, NestJS API |
| Mô tả | Khách xác nhận giỏ hàng, áp voucher/điểm, hệ thống tạo đơn `PENDING` trong transaction và khởi tạo giao dịch ZaloPay. Khi callback hoặc truy vấn trả về thành công, đơn chuyển `PAID`, điểm loyalty được cộng đúng một lần. |
| Trigger | Khách nhấn “Tiến hành thanh toán” từ màn hình giỏ hàng. |
| Phạm vi | Từ lúc khách xác nhận thanh toán đến khi đơn đạt `PAID` hoặc `CANCELLED`. Hoàn tiền thật nằm ngoài phạm vi. |

## 2. Pre-condition

1. Khách đã đăng nhập; request có `Authorization: Bearer <JWT>` hợp lệ.
2. Giỏ hàng có ít nhất một dòng hợp lệ; mỗi dòng có `productId`, `size`, `quantity` (1–99) và tối đa 3 `toppingIds` không trùng.
3. Sản phẩm và topping tồn tại, đang khả dụng.
4. Nguyên liệu theo công thức (`RecipeIngredient`) của mọi dòng còn đủ tồn kho cho size đã chọn.
5. Nếu dùng điểm: số điểm là bội số của 10 và không vượt số điểm hiện có.
6. Nếu dùng voucher: mã tồn tại, còn hiệu lực, đơn đạt `minOrderAmount`.

## 3. Post-condition

**Thành công**

- Có bản ghi `Order` trạng thái `PENDING` (sau đó `PAID`), các `OrderItem`, `OrderItemTopping` và `OrderStatusHistory`.
- Tiền do server tính: `subtotal`, `discountAmount`, `pointsUsed`, `totalAmount`, `finalAmount`.
- Nguyên liệu bị trừ theo công thức kèm ảnh chụp định lượng (`OrderIngredient`); `Ingredient.version` tăng.
- Có đúng một bản ghi `Payment` cho đơn; `appTransId` là duy nhất.
- Khi `PAID`: cộng điểm `floor(finalAmount / 1000)`, ghi `LoyaltyTransaction` loại `EARNED`, xóa giỏ hàng và `pendingOrderId`.

**Thất bại**

- Transaction rollback; không có đơn hoặc thay đổi tồn kho dở dang.
- Giỏ hàng và `pendingOrderId` được giữ nguyên để khách thử lại.
- Thanh toán thất bại: đơn `PAYMENT_FAILED`, giữ tồn kho cho lần thử lại; khách hủy thì hoàn kho và hoàn điểm đã giữ.

## 4. Main flow

| Bước | Tác nhân | Hành động |
|---|---|---|
| 1 | Khách hàng | Kiểm tra giỏ và nhấn “Tiến hành thanh toán”. |
| 2 | Next.js UI | Nếu chưa có phiên hợp lệ: lưu giỏ cục bộ và chuyển `/login?next=/checkout` (xem A1). Nếu đã đăng nhập: hiển thị điểm hiện có, ô voucher và tổng tiền dự kiến. |
| 3 | Khách hàng | Chọn số điểm muốn dùng, nhập voucher (tùy chọn) và nhấn “Đặt hàng và thanh toán”. |
| 4 | Next.js UI | Gửi `POST /api/v1/orders` với `items[]`, `promotionCode?`, `pointsUsed?`. |
| 5 | NestJS API | `JwtAuthGuard` lấy `userId = req.user.sub`; `ValidationPipe` kiểm tra `CreateOrderDto` (không nhận `userId` từ body). |
| 6 | NestJS API | Mở transaction `SERIALIZABLE`: đọc `Product`, `RecipeIngredient`, `Ingredient`, `Promotion`, `User`; tính lại toàn bộ tiền; kiểm tra voucher và hạn mức điểm. |
| 7 | NestJS API | Trừ kho có điều kiện: `UPDATE ingredients SET stock = stock - qty, version = version + 1 WHERE id = ... AND version = ... AND stock >= qty`. Lệch `version` hoặc thiếu hàng → `409 Conflict`, rollback. |
| 8 | NestJS API | Tạo `Order` (`PENDING`), `OrderItem`, `OrderIngredient` (ảnh chụp định lượng), `OrderStatusHistory` (`null → PENDING`); commit. |
| 9 | Next.js UI | Nhận `201 Created` (`orderId`, `totalAmount`, `status = PENDING`), lưu `pendingOrderId`, **không** xóa giỏ. |
| 10 | Khách hàng | Chọn ví ZaloPay và nhấn “Tạo thanh toán ZaloPay Sandbox”. |
| 11 | NestJS API | Kiểm tra quyền sở hữu đơn và trạng thái hợp lệ; sinh `app_trans_id`, ký HMAC-SHA256 bằng `key1`; gọi `/v2/create`. |
| 12 | ZaloPay Sandbox | Tạo giao dịch, trả `order_url` (`openinapp`). |
| 13 | NestJS API | Lưu `Payment` trạng thái `PENDING` gắn `orderId` + `appTransId` (UNIQUE); trả URL cho UI. |
| 14 | Khách hàng | Thanh toán trên giao diện ZaloPay Sandbox. |
| 15 | ZaloPay Sandbox | Gửi `POST /api/v1/payments/zalopay/callback` kèm `data` và `mac`. |
| 16 | NestJS API | Xác thực `mac` bằng `crypto.timingSafeEqual`; kiểm tra idempotency theo `appTransId`. |
| 17 | NestJS API | Trong một transaction: `Payment → SUCCESS`, `Order → PAID`, ghi `OrderStatusHistory`, cộng điểm (`EARNED`). Trả `return_code = 1`. |
| 18 | Next.js UI | Polling 15 giây hoặc nút “Kiểm tra kết quả” gọi `GET /orders/:id`, thấy `PAID` thì xóa giỏ và hiển thị xác nhận. |
| 19 | Khách hàng | Theo dõi tiến trình pha chế và nhận món tại quầy. |

## 5. Alternative / Exception flow

| Mã | Tại bước | Điều kiện | Xử lý | Kết quả |
|---|---|---|---|---|
| A1 | 2 | Chưa đăng nhập hoặc token hết hạn | Chuyển `/login?next=/checkout`, giữ giỏ; đăng nhập xong quay lại | Giỏ và ngữ cảnh thanh toán không mất |
| A2 | 3 | Có voucher / dùng điểm | Backend kiểm tra hạn mức (10 điểm = 1.000đ), khấu trừ trước khi gọi ZaloPay | Tổng tiền giảm đúng, có ghi nhận `pointsUsed` |
| A3 | 18 | Callback chưa về kịp | Khách nhấn “Kiểm tra kết quả” → API gọi Query API của ZaloPay và đồng bộ trạng thái | Đơn cập nhật đúng trạng thái thực tế |
| E1 | 5 | Thiếu/sai JWT | Trả `401 Unauthorized` | Không tạo đơn; giữ giỏ |
| E2 | 5–6 | DTO sai, `quantity` ngoài 1–99, size sai, topping trùng/quá 3 | Trả `400 Bad Request` kèm chi tiết validate | Không tạo đơn |
| E3 | 6 | Sản phẩm không tồn tại/không khả dụng/chưa có công thức | Trả `400 Bad Request` | Không tạo đơn |
| E4 | 7 | Hết nguyên liệu hoặc lệch `version` | Rollback transaction, trả `409 Conflict` | Không bán vượt kho; giữ giỏ |
| E5 | 7 | Lỗi ghi cơ sở dữ liệu | Rollback toàn bộ transaction | Không để lại dữ liệu dở dang |
| E6 | 16 | Callback lặp (giao dịch đã `SUCCESS`) | Không ghi lại; trả `return_code = 1` | Không tạo giao dịch/điểm trùng |
| E7 | 16 | Chữ ký `mac` sai | Từ chối cập nhật; trả `return_code = -1` | Đơn không đổi trạng thái |
| E8 | 14 | Khách hủy thanh toán hoặc quá hạn | Đơn `PAYMENT_FAILED`; khách có thể thử lại với `Idempotency-Key` mới hoặc hủy đơn | Thử lại không giới hạn |
| E9 | 14 | Khách hủy đơn / cron phát hiện quá hạn | `CANCELLED`; hoàn nguyên liệu theo ảnh chụp và hoàn điểm đã giữ | Kho và điểm trở về đúng trạng thái |

## 6. Business rules

| ID | Quy tắc |
|---|---|
| BR-01 | Giá do **server** tính; không tin `finalAmount`, `discountAmount` hay `userId` do client gửi. |
| BR-02 | Đơn mới luôn `PENDING`; client không chọn trạng thái. |
| BR-03 | `userId` lấy từ `req.user.sub`; `CreateOrderDto` không có trường `userId`. |
| BR-04 | Trừ kho trong transaction bằng optimistic lock (`version`) và điều kiện `stock >= qty`; mọi thay đổi rollback cùng nhau. |
| BR-05 | Hủy đơn chỉ từ `PENDING`/`PAYMENT_FAILED` qua `POST /orders/:id/cancel`; hoàn kho trong cùng transaction. `PAID → CANCELLED` chỉ tồn tại ở mức state machine, ngoài phạm vi MVP. |
| BR-06 | Mỗi đơn áp tối đa một voucher; `discountAmount` do `PromotionsService` tính. |
| BR-07 | Mọi chuyển trạng thái đi qua `OrderService.transition` và `assertTransition`; sai luật trả `409`. |
| BR-08 | `1 ≤ quantity ≤ 99`; tối đa 3 topping không trùng; điểm dùng là bội số của 10. |
| BR-09 | `appTransId` là duy nhất; callback và `sync` đều idempotent, cộng điểm tối đa một lần mỗi đơn. |
| BR-10 | Giỏ hàng chỉ bị xóa khi đơn đạt `PAID`; mọi lỗi trước đó giữ nguyên giỏ. |

## 7. Acceptance criteria

| ID | Given / When / Then |
|---|---|
| AC-01 | **Given** JWT hợp lệ, giỏ hợp lệ, đủ kho. **When** gửi `POST /orders`. **Then** `201`, đơn `PENDING`, tiền do server tính, response có `orderId`. |
| AC-02 | **Given** thiếu/sai JWT. **When** gửi request. **Then** `401`, không tạo đơn. |
| AC-03 | **Given** `quantity = 0/100` hoặc size sai. **When** gửi request. **Then** `400`, không tạo đơn. |
| AC-04 | **Given** tồn kho chỉ đủ một phần. **When** hai request đồng thời. **Then** đúng một đơn `201`, đơn còn lại `409`, tồn kho không âm. |
| AC-05 | **Given** callback gửi hai lần cùng `appTransId`. **When** API xử lý. **Then** chỉ một giao dịch `SUCCESS`, điểm chỉ cộng một lần, lần hai trả `return_code = 1`. |
| AC-06 | **Given** `mac` sai. **When** callback tới. **Then** trả `return_code = -1`, đơn giữ nguyên trạng thái. |
| AC-07 | **Given** khách hủy đơn `PENDING`. **When** gọi `POST /orders/:id/cancel`. **Then** đơn `CANCELLED`, nguyên liệu và điểm được hoàn đúng một lần. |
| AC-08 | **Given** thanh toán thất bại. **When** khách thử lại với key mới. **Then** tạo giao dịch mới, không nhân đôi điểm hay tồn kho. |

## 8. Liên kết với State Machine

| Luồng | Chuyển trạng thái |
|---|---|
| Tạo đơn thành công | `(start) → PENDING` |
| Callback/truy vấn thành công | `PENDING → PAID` (+ cộng điểm) |
| Thanh toán thất bại | `PENDING → PAYMENT_FAILED` |
| Thử lại | `PAYMENT_FAILED → PENDING` |
| Khách hủy | `PENDING/PAYMENT_FAILED → CANCELLED` (+ hoàn kho, hoàn điểm) |
| Barista nhận đơn | `PAID → PREPARING → READY → COMPLETED` |

## 9. Tài liệu liên quan

- [`../diagrams/activity-end-to-end.puml`](../diagrams/activity-end-to-end.puml) — activity end-to-end
- [`../diagrams/sequence-checkout.puml`](../diagrams/sequence-checkout.puml) — sequence 5 lifeline
- [`../diagrams/usecase-overall.puml`](../diagrams/usecase-overall.puml) — use-case tổng quát
- [`../order/state-machine.md`](../order/state-machine.md) — bảng chuyển trạng thái
- [`srs.md`](srs.md) — FR-03…FR-10, NFR-04
- [`../test-scenarios/test-scenarios.md`](../test-scenarios/test-scenarios.md) — kịch bản kiểm thử

## 10. Lịch sử thay đổi

- v1.0 (09/10/2026): đặc tả tạo đơn.
- v1.1 (16/10/2026): áp dụng quyết định D1, D2, D4, D5, D6, D7.
- v2.0 (16/11/2026): gộp nhánh thanh toán ZaloPay (FR-05, FR-08), đổi mã HTTP xung đột tồn kho sang `409`, thêm BR-09/BR-10 và AC-05…AC-08.
