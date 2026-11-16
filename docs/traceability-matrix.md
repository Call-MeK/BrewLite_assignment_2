# Ma trận truy vết yêu cầu – BrewLite

Cập nhật: 2026-11-16. Mỗi yêu cầu trong [SRS](requirements/srs.md) được truy vết theo đúng mẫu của
đề: **mã yêu cầu → use-case/user story → thiết kế/sơ đồ → code/API → test**.

Quy ước cột Test: mã `TS-...` là kịch bản trong
[test-scenarios](test-scenarios/test-scenarios.md); tên tệp là test tự động; ghi **thủ công** khi chỉ
kiểm theo checklist. Trạng thái tổng hợp: `Tự động` = có test chạy trong CI · `Một phần` = có test
nhưng chưa phủ hết · `Thủ công` = chỉ kiểm theo checklist.

## 1. Yêu cầu chức năng

| Mã yêu cầu | Use-case / User story | Thiết kế / Sơ đồ | Code / API | Test |
|---|---|---|---|---|
| FR-01 | US-01, US-02; UC Menu | UseCase-ProductCatalog; Activity-ProductCatalog | `GET /products`; `apps/api/src/modules/products/`; `apps/web/src/app/menu/`, `apps/web/src/lib/menu-filter.ts` | `products.test.cjs` (7), `product-access.test.cjs` (1), `menu-filter.test.mjs` (1); TS-FR-01-01 → 07 |
| FR-02 | US-03; UC Product Detail | UseCase-ProductDetail; Activity-ProductDetail; Class-Product/ProductSizePrice/Topping | `GET /products/:id`; `products.service.ts`; `apps/web/src/app/products/[id]/`, `apps/web/src/types/product.ts` | `products.test.cjs` (size hết hàng); TS-FR-02-01 → 06 (03/04 unit frontend; 01/02/05/06 thủ công) |
| FR-03 | US-04; UC Cart | UseCase-Cart; Activity-Cart; Class-Cart/CartItem | `apps/web/src/lib/cart-items.ts`, `store/useCartStore.ts`, `lib/pending-order.ts`; `apps/api/src/modules/cart/` | `cart-items.test.mjs` (5), `cart.test.cjs` (3); TS-FR-03-01 → 07 |
| FR-04 | US-05; UC Auth | UseCase-Auth; Activity-Auth; Sequence-JWT-Auth; Class-User | `POST /auth/register`, `POST /auth/login`, `GET/PUT /auth/me`, `POST /auth/change-password`; `modules/auth/` | `auth-profile.test.cjs` (5), `core-flow.test.cjs`; TS-FR-04-01 → 09 |
| FR-05 | UC-01, US-06, US-07 | UseCase-Order; Activity-EndToEnd; Sequence-Checkout; Class-Order/OrderItem/Payment | `POST /orders`, `POST /payments/zalopay`; `modules/orders/`, `modules/payments/` | `orders.test.cjs` (create), `orders-integration.test.cjs`, `core-flow.test.cjs`, `tests/e2e/checkout-flow.test.mjs`; TS-FR-05-01 → 10 |
| FR-06 | US-08; UC Order History | UseCase-OrderHistory; Activity-OrderHistory; Class-Order | `GET /orders/me`, `GET /orders/:id`; `orders.controller.ts`; `apps/web/src/app/orders/` | `orders-integration.test.cjs` (history/detail), `orders.test.cjs` (history scopes); TS-FR-06-01 → 08 |
| FR-07 | US-10; UC Admin Order | StateMachine-Order (`docs/order/state-machine.md`); Class-Order | `PATCH /admin/orders/:id/status`, `POST /orders/:id/cancel`; `orders.service.ts` (`transition`, `cancel`, cron hủy đơn quá 15 phút) | `orders.test.cjs` (state machine, cancel/points), `orders-integration.test.cjs` (prep vs cancel, payment vs cancel, expiry), `admin-flow.test.cjs`; TS-FR-07-01 → 09 |
| FR-08 | US-07; UC Payment | Sequence-Payment; Class-Payment | `POST /payments/zalopay` (`Idempotency-Key`), `POST /payments/zalopay/:id/sync`, `POST /payments/zalopay/callback`, `POST /payments/zalopay/:id/cancel` | `payment-idempotency.test.cjs` (3), `zalopay-change-method.test.cjs` (3); TS-FR-08-01 → 05 |
| FR-09 | US-06; UC Order + Inventory | Activity-EndToEnd; Class-RecipeIngredient/Ingredient/StockImport | `orders.service.ts` (reserve/restore); `modules/ingredients/`, `modules/recipes/`, `modules/stock-imports/` | `ingredient-reservation.test.cjs` (2), `orders.test.cjs` (reserve), `orders-integration.test.cjs` (concurrent), `core-flow.test.cjs`; TS-FR-09-01, 03, 04; TS-E2E-STOCK-01 |
| FR-10 | US-09; UC Checkout | Activity-Checkout; Class-Promotion/LoyaltyTransaction | `orders.service.ts` (voucher/points); `apps/web/src/app/checkout/page.tsx` | `promotions.test.cjs` (1), `orders.test.cjs` (redeem/refund points), `promotion-checkout.test.mjs` (2); TS-FR-10-01, 03 → 06 |
| FR-11 | US-10, US-11, US-12; UC Admin | UseCase-Overall (Admin); Activity diagrams theo module; Class-Domain | `admin/*` (orders, payments, users), `products/`, `ingredients/`, `recipes/`, `stock-imports/`; `apps/web/src/app/admin/` | `admin-flow.test.cjs` (3), `admin-user-integration.test.cjs` (1), `ingredient-integration.test.cjs` (1); TS-FR-11 (checklist thủ công) |
| FR-12 | US-08; UC Order History | Activity-OrderHistory; Class-Order | Polling 15 giây ở `apps/web/src/app/orders/`; thông báo lỗi tiếng Việt ở các trang | TS-FR-12 (thủ công) |

## 2. Yêu cầu phi chức năng

| Mã yêu cầu | Thuộc tính | Thiết kế / cách kiểm chứng | Bằng chứng |
|---|---|---|---|
| NFR-01 | Hiệu năng | Index Prisma; đo 5 lượt trên production sau khi dịch vụ thức | Trung vị 81–182 ms, tối đa 194 ms, mục tiêu < 500 ms; đo thủ công bằng Postman, không có test tự động |
| NFR-02 | Bảo mật | JWT + role guard, bcrypt, DTO validation, `timingSafeEqual` cho MAC ZaloPay | `auth-profile.test.cjs`, `orders-integration.test.cjs` (401/403/404), `core-flow.test.cjs`; TS-FR-04-06 → 08, TS-NFR-02-04/05 |
| NFR-03 | Tương thích | Tailwind responsive; kiểm tra 390×844 và 1440×900 | Hình 7–12 (14 ảnh trong báo cáo, 16 ảnh nguồn); TS-NFR-03-01 thủ công trên Chromium; chưa có test đa trình duyệt |
| NFR-04 | Toàn vẹn dữ liệu | Transaction Serializable, optimistic lock, UNIQUE `Idempotency-Key` | `orders.test.cjs`, `orders-integration.test.cjs`, `payment-idempotency.test.cjs`, `ingredient-reservation.test.cjs` |
| NFR-05 | Khả dụng | Loading/empty/error; hộp thoại xác nhận thao tác nguy hiểm | Ảnh giao diện; TS-NFR-05 (thủ công) |
| NFR-06 | Bảo trì | TypeScript strict, 9 module, tài liệu API/DB/ADR | `npm run build` (type check), `docs/` |
| NFR-07 | Kiểm thử | 49 test backend + 10 test frontend + 1 E2E HTTP; build/lint trong CI; CD chỉ chạy sau CI xanh | `.github/workflows/ci.yml`, `.github/workflows/cd.yml`; kết quả bảng 26 |
| NFR-08 | Cấu hình | Biến môi trường, `.env.example`, không commit secret | `.gitignore`, `.env.example`; review thủ công |
| NFR-09 | Khả năng triển khai | `docker compose up`; HTTPS; `/health`; CD tự động sau CI | `docker-compose.yml`, `docs/deployment.md`, `.github/workflows/cd.yml`, URL production |

## 3. Bàn giao và triển khai

| Mã | Nội dung | Tài liệu / mã nguồn | Kiểm chứng | Trạng thái |
|---|---|---|---|---|
| DEL-01 | Hướng dẫn chạy, tài khoản demo, dữ liệu seed | `README.md`; `apps/api/prisma/seed.ts`; `docker-compose.yml` | Chạy `docker compose up --build` từ máy sạch | Thủ công |
| DEL-02 | Quy trình triển khai và rollback | `docs/deployment.md`; `docs/architecture/deployment-diagram.puml` | Checklist smoke test sau deploy | Đã triển khai demo: <https://brewlite-acme-1b6f1.vercel.app> + <https://brewlite-api-u2jb.onrender.com/api/v1> |
| DEL-03 | CI trên nhánh `main` | `.github/workflows/ci.yml` | GitHub Actions (hai job frontend/backend) | Tự động |
| DEL-04 | CD sau CI xanh trên `main` | `.github/workflows/cd.yml` | Deploy Render đúng `commitId`, smoke `/health`, deploy/xác minh Vercel, smoke trang chủ, rollback khi smoke lỗi | Tự động một phần: chưa có registry/image tag, migration chỉ do pipeline điều khiển khi khai báo `PROD_DATABASE_URL`, smoke test mới phủ `/health` + trang chủ |

## 4. Truy vết theo yêu cầu đồ án (Assignment 2)

| Hạng mục | Yêu cầu | Tài liệu / mã nguồn | Trạng thái |
|---|---|---|---|
| Task 4.4 | Đặc tả use case, activity, sequence | `docs/*/usecase-*.md`, `docs/diagrams/*.puml` | Đạt |
| Task 5.1 | Thanh toán không tiền mặt (Ví/Thẻ) | ZaloPay Sandbox: `zalopay-sandbox.controller.ts`, `apps/web/src/components/payments/zalopay-sandbox-panel.tsx` | Đạt (sandbox; mock đã gỡ) |
| Task 5.2 | Idempotency và chống trùng giao dịch | `zalopay-sandbox.service.ts`; `docs/_archive/payment/api-contract-payment.md` mục 7; test `apps/api/test/payment-idempotency.test.cjs` (cùng key, khác payload, request đồng thời) | Đạt |
| Task 5.3 | Callback/đồng bộ trạng thái thanh toán | `zalopay-sandbox.controller.ts` (`callback`, `sync`); `docs/_archive/payment/api-contract-payment.md` mục 4–5 | Đạt |
| Task 5.4 | Đối soát và quản lý giao dịch | `payment-management.service.ts`; `apps/web/src/app/admin/payments/page.tsx` | Đạt |
| Task 8.1 | Kiểm thử và CI | `apps/api/test/`, `apps/web/tests/`, `tests/e2e/checkout-flow.test.mjs`, `.github/workflows/ci.yml` | Đạt một phần (E2E HTTP có; chưa có E2E trình duyệt) |
| Task 8.2 | CD: quality gate → deploy → migration → smoke test → rollback | `.github/workflows/cd.yml`, `docs/deployment.md` | Đạt một phần (deploy đúng commit + smoke + rollback; chưa có registry/image tag; smoke mới phủ `/health` + trang chủ) |
| Task 9 | Bàn giao, hướng dẫn chạy, demo | `README.md`, `docs/deployment.md`, tài khoản seed | Đạt (đã deploy demo Vercel + Render + Neon) |

## 5. Khoảng trống đã biết

| Khoảng trống | Ảnh hưởng | Hướng xử lý |
|---|---|---|
| Chưa có E2E Playwright/Cypress | Luồng UI được kiểm thủ công; `tests/e2e/` chỉ kiểm qua HTTP | Bổ sung E2E trình duyệt nếu còn thời gian |
| Chưa đóng gói/đẩy image lên registry, chưa có image tag | Không có artefact bất biến theo release; Rollback dựa vào deployment trước của Render | Thêm bước build/push GHCR + tag theo commit/tag Git |
| Render/Vercel vẫn bật Auto-Deploy | Có thể phát hành trước khi CI kết thúc | Tắt Auto-Deploy để CD là cổng duy nhất |
| Smoke test mới phủ `/health` và trang chủ | Lỗi ở đăng nhập/tạo đơn/thanh toán không bị chặn tự động | Mở rộng smoke test sang luồng đọc dữ liệu và thanh toán sandbox |
| Migration mặc định chạy trong container start | Không bảo đảm migration xong trước khi đổi traffic nếu không khai báo `PROD_DATABASE_URL` | Luôn khai báo secret để CD chạy `prisma migrate deploy` trước deploy |
| Callback ZaloPay với app sandbox công khai (2554) | Có thể không nhận callback | Trang thanh toán tự `sync` mỗi 15 giây và có nút “Kiểm tra kết quả” |
| Render Free ngủ sau ~15 phút | Callback/cron trễ, cold start 30–60 giây | Workflow `.github/workflows/keepalive.yml` ping `/api/v1/health` mỗi 5 phút |
| Backend dùng `@Cron` mỗi phút | Không chạy được trên serverless thuần | Triển khai backend dạng container/VM |
| Tồn kho giữ chỗ cho đơn bỏ dở | Đơn `PENDING` giữ nguyên liệu đến khi hủy | Cron hủy đơn quá hạn đã có; có thể tinh chỉnh TTL |
