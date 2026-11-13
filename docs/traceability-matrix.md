# Ma trận truy vết yêu cầu – BrewLite

Cập nhật: 2026-11-13. Mỗi yêu cầu trong [SRS](requirements/srs.md) được truy vết tới thiết kế,
mã nguồn và kiểm thử tương ứng.

**Trạng thái:** `Tự động` = có test chạy trong CI · `Thủ công` = kiểm tra theo kịch bản ·
`Một phần` = đã có nhưng chưa phủ hết · `Chưa có` = chưa triển khai.

## 1. Yêu cầu chức năng

| Mã yêu cầu | Mô tả | Thiết kế / mã nguồn | Kiểm thử | Trạng thái |
|---|---|---|---|---|
| FR-01 | Menu, tìm kiếm, lọc danh mục | `docs/product-catalog/*`; `backend/src/modules/products/`; `frontend/src/app/menu/page.tsx`, `frontend/src/lib/menu-filter.ts` | `frontend/tests/menu-filter.test.mjs`; TS-FR-01-01 → 07 | Tự động |
| FR-02 | Chi tiết, size, topping, giá tùy chọn | `docs/product-detail/*`; `backend/src/modules/products/`; `frontend/src/app/products/[id]/page.tsx` | TS-FR-02-01 → 06 (thủ công) | Một phần |
| FR-03 | Giỏ hàng, tính tiền, giữ giỏ khi lỗi | `docs/cart/*`; `frontend/src/lib/cart-items.ts`, `frontend/src/app/cart/page.tsx`, `frontend/src/lib/pending-order.ts` | `frontend/tests/cart-items.test.mjs`; TS-FR-03-01 → 07 | Tự động |
| FR-04 | Đăng ký/đăng nhập JWT, phân quyền, đổi mật khẩu | `docs/auth/*`; `backend/src/modules/auth/`; `frontend/src/app/login/page.tsx` | `orders-integration.test.cjs` (401/403/404); TS-FR-04-01 → 09 | Tự động |
| FR-05 | Tạo đơn và thanh toán ZaloPay Sandbox | `docs/order/*`, `docs/payment/*`; `backend/src/modules/orders/orders.service.ts`, `backend/src/modules/payments/zalopay-sandbox.*`; `frontend/src/app/orders/[id]/payment/page.tsx` | `orders-integration.test.cjs`; `zalopay-change-method.test.cjs`; TS-FR-05-01 → 10 | Tự động + thủ công |
| FR-06 | Xác nhận và lịch sử đơn | `docs/order-history/*`; `backend/src/modules/orders/orders.controller.ts`; `frontend/src/app/orders/` | `orders-integration.test.cjs` (owner/outsider, admin detail); TS-FR-06-01 → 08 | Tự động |
| FR-07 | Order State Machine, hủy, hoàn kho/điểm | `docs/order/state-machine.md`; `backend/src/modules/orders/orders.service.ts` (`transition`, `cancel`) | `orders-integration.test.cjs` (cancel vs prepare/payment, expiry); TS-FR-07-01 → 09 | Tự động |
| FR-08 | Thanh toán idempotent, callback, sync, cancel | `docs/payment/api-contract-payment.md`; `backend/src/modules/payments/` | `zalopay-change-method.test.cjs`; TS-FR-08-01 → 05 | Tự động + thủ công |
| FR-09 | Kiểm soát tồn kho khi đặt đồng thời | `docs/database-design.md`; `backend/src/modules/orders/orders.service.ts` | `orders-integration.test.cjs` (stock restore); TS-FR-09-01, 03, 04; TS-E2E-STOCK-01 | Tự động |
| FR-10 | Khuyến mãi và loyalty | `backend/src/modules/orders/`, `backend/src/modules/users/`; `frontend/src/app/checkout/page.tsx` | `frontend/tests/promotion-checkout.test.mjs`; `orders-integration.test.cjs` (points); TS-FR-10-01 → 06 | Tự động |
| FR-11 | Quản trị sản phẩm, kho, đơn, thanh toán, người dùng | `backend/src/modules/{products,ingredients,recipes,stock-imports,payments,users}/`; `frontend/src/app/admin/` | Kiểm tra thủ công theo checklist admin; TS-FR-08-* cho đối soát thanh toán | Một phần |

## 2. Yêu cầu phi chức năng

| Mã yêu cầu | Mô tả | Thiết kế / mã nguồn | Kiểm thử | Trạng thái |
|---|---|---|---|---|
| NFR-01 | API đọc dữ liệu mẫu < 500 ms | Index Prisma; `docs/database-design.md` | TS-NFR-01-01 → 05 (đo thủ công bằng Postman) | Một phần |
| NFR-02 | Bảo mật JWT, bcrypt, DTO, MAC | `backend/src/modules/auth/`, `backend/src/common/`, `zalopay-sandbox.gateway.ts` | `orders-integration.test.cjs` (401/403); unit test cancel; TS-NFR-02-04, 05 | Tự động |
| NFR-03 | Tương thích trình duyệt, responsive | Tailwind breakpoints; `frontend/src/app/` | TS-NFR-03-01 (thủ công trên 4 trình duyệt) | Thủ công |
| NFR-04 | Toàn vẹn dữ liệu, transaction, unique | `backend/prisma/schema.prisma`; `orders.service.ts`; `zalopay-sandbox.service.ts` | `orders-integration.test.cjs`; `zalopay-change-method.test.cjs` | Tự động |
| NFR-05 | Loading/empty/error, xác nhận thao tác | `frontend/src/app/` các trang admin/order/payment | TS-NFR-05 (thủ công) | Thủ công |
| NFR-06 | Tài liệu API/DB/ADR, TypeScript strict | `docs/`; `docs/architecture/adr/`; `tsconfig.json` | `npm run build` (type check) | Tự động |
| NFR-07 | Build + test trong CI | `.github/workflows/ci.yml` (nhánh `main`) | GitHub Actions run trên `main` | Tự động |
| NFR-08 | Cấu hình qua biến môi trường, không commit secret | `.env.example`, `docker-compose.yml` | Kiểm tra `.gitignore` + review | Thủ công |

## 3. Bàn giao và triển khai

| Mã yêu cầu | Mô tả | Thiết kế / mã nguồn | Kiểm thử | Trạng thái |
|---|---|---|---|---|
| DEL-01 | Hướng dẫn chạy, tài khoản demo, dữ liệu seed | `README.md`; `backend/prisma/seed.ts`; `docker-compose.yml` | Chạy `docker compose up --build` từ máy sạch | Thủ công |
| DEL-02 | Quy trình triển khai và rollback | `docs/deployment.md`; `docs/architecture/deployment-diagram.puml` | Checklist smoke test sau deploy | Đã triển khai demo: <https://brewlite-acme-1b6f1.vercel.app> + <https://brewlite-api-u2jb.onrender.com/api/v1> |
| DEL-03 | CI trên nhánh `main` | `.github/workflows/ci.yml` | GitHub Actions | Tự động |

## 4. Truy vết theo yêu cầu đồ án (Assignment 2)

| Hạng mục | Yêu cầu | Tài liệu / mã nguồn | Trạng thái |
|---|---|---|---|
| Task 4.4 | Đặc tả use case, activity, sequence | `docs/*/usecase-*.md`, `docs/*/activity-*.puml`, `docs/diagrams/sequence-checkout.puml` | Đạt |
| Task 5.1 | Thanh toán không tiền mặt (Ví/Thẻ) | ZaloPay Sandbox: `zalopay-sandbox.controller.ts`, `frontend/src/components/payments/zalopay-sandbox-panel.tsx` | Đạt (sandbox; mock đã gỡ) |
| Task 5.2 | Idempotency và chống trùng giao dịch | `zalopay-sandbox.service.ts`; `docs/payment/api-contract-payment.md` mục 7 | Đạt |
| Task 5.3 | Callback/đồng bộ trạng thái thanh toán | `zalopay-sandbox.controller.ts` (`callback`, `sync`); `docs/payment/api-contract-payment.md` mục 4–5 | Đạt |
| Task 5.4 | Đối soát và quản lý giao dịch | `payment-management.service.ts`; `frontend/src/app/admin/payments/page.tsx` | Đạt |
| Task 8.1 | Kiểm thử và CI | `backend/test/`, `frontend/tests/`, `.github/workflows/ci.yml` | Đạt một phần (chưa có E2E trình duyệt tự động) |
| Task 9 | Bàn giao, hướng dẫn chạy, demo | `README.md`, `docs/deployment.md`, tài khoản seed | Đạt (đã deploy demo Vercel + Render + Neon) |

## 5. Khoảng trống đã biết

| Khoảng trống | Ảnh hưởng | Hướng xử lý |
|---|---|---|
| Chưa có E2E Playwright/Cypress | Luồng UI được kiểm thủ công | Bổ sung ở giai đoạn D (tái cấu trúc repo) |
| Callback ZaloPay với app sandbox công khai (2554) | Có thể không nhận callback | Trang thanh toán tự `sync` mỗi 15 giây và có nút “Kiểm tra kết quả” |
| Render Free ngủ sau ~15 phút | Callback/cron trễ, cold start 30–60 giây | Workflow `.github/workflows/keepalive.yml` ping `/api/v1/health` mỗi 5 phút |
| Backend dùng `@Cron` mỗi phút | Không chạy được trên serverless thuần | Triển khai backend dạng container/VM |
| Tồn kho giữ chỗ cho đơn bỏ dở | Đơn `PENDING` giữ nguyên liệu đến khi hủy | Cron hủy đơn quá hạn đã có; có thể tinh chỉnh TTL |
