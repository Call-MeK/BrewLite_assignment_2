# Đọc tài liệu BrewLite

BrewLite là app đặt cà phê: **Next.js** (frontend) + **NestJS** (backend) + **PostgreSQL**, thanh toán **ZaloPay Sandbox**.

Nếu chỉ có 10 phút, đọc theo thứ tự: **file này → [SRS](requirements/srs.md) → [Ma trận truy vết](traceability-matrix.md)**.
Muốn chạy thử: xem [README gốc](../README.md).

---

## 1. Muốn biết gì thì đọc file nào

| Câu hỏi | File |
|---|---|
| Hệ thống làm được gì, yêu cầu FR-01…FR-11 | [requirements/srs.md](requirements/srs.md) |
| Phạm vi, actor, cái gì không làm | [requirements/context-and-scope.md](requirements/context-and-scope.md) |
| Yêu cầu nào ứng với code/test nào | [traceability-matrix.md](traceability-matrix.md) |
| Có những bảng DB nào | [database-design.md](database-design.md) |
| Chạy/deploy/rollback thế nào | [deployment.md](deployment.md) |
| Đặt tên API, DB, file | [naming-convention.md](naming-convention.md) |
| Nhánh và commit thế nào | [git-convention.md](git-convention.md) |
| Review code cần kiểm gì | [checklist-review.md](checklist-review.md) |
| Vì sao chọn monorepo / bỏ mock payment | [architecture/adr/](architecture/adr/) |
| Sơ đồ activity / use-case / sequence | [diagrams/](diagrams/) |

---

## 2. Luồng nghiệp vụ chính (một dòng)

```
Menu → Chi tiết sản phẩm (size + topping) → Giỏ hàng → Checkout
     → Tạo đơn PENDING → ZaloPay → PAID → PREPARING → READY → COMPLETED
```

Nhánh lỗi: `PENDING → PAYMENT_FAILED → PENDING` (thử lại) hoặc `→ CANCELLED` (hủy, hoàn nguyên liệu + điểm).

Trạng thái đơn nằm trong `apps/api/src/modules/orders/order-state.ts` — đây là nguồn đúng, docs chỉ mô tả lại.

---

## 3. Tài liệu theo từng chức năng

Mỗi thư mục là **một chức năng**. Sơ đồ PlantUML của mọi chức năng nằm chung ở
[`diagrams/`](diagrams/) (Task 2), tài liệu đặc tả giữ theo chức năng:

| File | Nội dung |
|---|---|
| `usecase-*.md` | Actor, luồng, điều kiện trước/sau |
| `api-contract*.md` | Endpoint, request/response, mã lỗi |
| `db-mapping*.md` | Dữ liệu FE ↔ bảng DB |
| `fe-be-skeleton*.md` | Cấu trúc code gợi ý cho FE/BE |
| `*test-cases*.md` | Kịch bản kiểm thử của chức năng |

Thứ tự đọc một chức năng: **usecase → api-contract → db-mapping**. Chỉ mở skeleton khi cần viết code.

| Chức năng | Thư mục |
|---|---|
| Xác thực | [auth/](auth/) |
| Menu sản phẩm | [product-catalog/](product-catalog/) |
| Chi tiết sản phẩm | [product-detail/](product-detail/) |
| Giỏ hàng | [cart/](cart/) |
| Đặt hàng | [order/](order/) |
| Thanh toán | [payment/](payment/) |
| Lịch sử đơn | [order-history/](order-history/) |
| Kiểm thử toàn hệ thống | [test-scenarios/](test-scenarios/) |

---

## 4. Ba quy tắc quan trọng nhất

1. **Tiền và tồn kho chỉ tính ở backend**, trong transaction; client không gửi `userId`, `finalAmount`.
2. **Thanh toán idempotent**: bắt buộc `Idempotency-Key`, callback lặp không tạo giao dịch/điểm trùng.
3. **Không commit secret**: chỉ commit `.env.example`; giá trị thật để trong `.env` / `apps/api/.env`.

Chi tiết đầy đủ ở [SRS](requirements/srs.md) mục 2 và [checklist-review.md](checklist-review.md).
