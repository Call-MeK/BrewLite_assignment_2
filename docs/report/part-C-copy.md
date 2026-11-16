# PHẦN C — Task 5, Ma trận truy vết và Kết luận

> Bản Markdown để C copy sang Word, đã đồng bộ với `sections/05-task5-sprint2.tex`,
> `sections/08-truy-vet.tex` và `sections/10-ket-luan.tex`. Nội dung viết theo hiện trạng repo tại
> thời điểm chốt: **đã có
> pipeline CD tự động** tại `.github/workflows/cd.yml`, chạy sau khi CI xanh, deploy đúng commit,
> smoke test `/health` + trang chủ và rollback khi smoke test thất bại. Các phần **chưa** tự động
> (registry/image tag, migration bắt buộc, smoke test hết luồng, rollback cho mọi loại lỗi, E2E
> trình duyệt) được ghi rõ, không mô tả quá.
>
> Lưu ý số mục: theo `docs/REPORT-SOURCE-MAP.md`, mục truy vết là **7** và kết luận là **8**
> (mục 9 là checklist của B). Trong `docs/report/as2.tex`, thứ tự `\input` cuối đã được đổi thành
> `05 → 08 → 10 → 09`, nên kết luận vẫn là mục 8 và checklist của B là mục 9.

---

## 6. Task 5 — Sprint 2, CI/CD và bàn giao

### 6.1 Task 5.1 — Hoàn thiện MVP end-to-end

Sprint 2 (27/10 – 14/11/2026) khép kín luồng nghiệp vụ từ chọn món đến theo dõi đơn: menu →
chi tiết/size/topping → giỏ hàng → đăng nhập → tạo đơn → thanh toán ZaloPay Sandbox → xác nhận
và lịch sử đơn. Trọng tâm của sprint là biến các đặc tả ở Task 1–2 thành luồng chạy thật, đồng
thời giữ tính đúng đắn ở các điểm dễ sai: giá tính ở server, tồn kho khi đặt đồng thời, trạng
thái đơn và tính idempotent của thanh toán. Bảng 25 tổng hợp bảy nhóm chức năng đã hoàn thiện.

**Bảng 25: Chức năng hoàn thiện trong Sprint 2**

| Nhóm | Nội dung | Mã FR |
|---|---|---|
| Chi tiết và tùy chọn | Chọn size S/M/L, topping; giá cập nhật ngay; chặn size/topping hết nguyên liệu; số lượng mỗi dòng 1–99 | FR-02 |
| Giỏ hàng | Zustand store; gộp dòng theo `product + size + topping`; giữ giỏ và `pendingOrderId` khi tạo đơn/thanh toán lỗi; chỉ xóa giỏ khi đơn `PAID` | FR-03 |
| Xác thực và phân quyền | Đăng ký/đăng nhập JWT; bcrypt; role `ADMIN`; đổi mật khẩu làm tăng `ver`, vô hiệu token cũ | FR-04 |
| Tạo đơn và tồn kho | Transaction khi tạo đơn; snapshot giá; trừ nguyên liệu theo công thức của size; chống bán vượt tồn kho | FR-05, FR-09 |
| Thanh toán | ZaloPay Sandbox; `Idempotency-Key`; callback/`sync`/`cancel`; đối soát giao dịch ở khu quản trị | FR-05, FR-08 |
| Trạng thái và lịch sử | Bảy trạng thái, chín chuyển tiếp hợp lệ; chặn chuyển sai bằng `409`; hủy đơn hoàn kho/điểm một lần; lịch sử phân trang | FR-06, FR-07, FR-10 |
| Quản trị và phản hồi | CRUD sản phẩm, kho, công thức, đơn, người dùng; trạng thái loading/empty/error; trang chờ thanh toán tự làm mới mỗi 15 giây | FR-11, FR-12 |

**Chi tiết sản phẩm: API và kiểu dữ liệu phía web.** Trang chi tiết dùng `GET /products/:id`
(`ProductsController.findOne` gọi `ProductsService.getProductDetail`). Response đã bọc bởi
`TransformInterceptor`, phần `data` gồm `id`, `name`, `imageUrl`, `basePrice`, `currency`,
`categorySlug`, `isAvailable`, mảng `sizePrices` và mảng `toppings`. Mỗi phần tử `sizePrices` có
`size` (S/M/L), `priceAdjustment`, `isAvailable` và `availableQuantity`; số ly khả dụng được tính ở
server từ công thức của size và tồn kho nguyên liệu, nên client không tự quyết định size còn hàng.
Mỗi topping có `id`, `name`, `price`; cà phê không trả topping, các món khác chỉ trả topping đang
bán và còn kho.

Phía web, `apps/web/src/types/product.ts` khai báo `ProductSize`, `ProductSizePrice`,
`ProductTopping`, `ProductDetail`, `ProductSummary` và `CartItemDraft`. Trang
`apps/web/src/app/products/[id]/page.tsx` kiểm tra hình dạng dữ liệu bằng `isValidProduct` trước khi
render, mặc định chọn size M nếu còn hàng, chặn chọn quá 3 topping, giới hạn số lượng 1–99 và không
vượt `availableQuantity`. Giá ước tính ở client là `basePrice + priceAdjustment + topping`; khi thêm
vào giỏ, trang tạo `CartItemDraft` kèm `estimatedUnitPrice` và `currency`. Đây chỉ là giá ước tính:
server tính lại toàn bộ giá khi tạo đơn, nên sửa request trên trình duyệt không làm thay đổi số tiền
phải trả. Test `products.test.cjs` kiểm chi tiết sản phẩm và trường hợp size hết nguyên liệu; các
nhánh UI được kiểm theo TS-FR-02.

**Máy trạng thái đơn hàng.** Đơn hàng có bảy trạng thái `PENDING`, `PAYMENT_FAILED`, `PAID`,
`PREPARING`, `READY`, `COMPLETED`, `CANCELLED`, với chín chuyển tiếp hợp lệ giữa các trạng thái
và một bước khởi tạo `(start) → PENDING`. Mọi thay đổi trạng thái bắt buộc đi qua
`OrderService.transition`; hàm `assertTransition` từ chối mọi chuyển tiếp ngoài sơ đồ và trả
`409 Conflict`. Câu lệnh cập nhật dùng điều kiện `WHERE id = ... AND status = ... AND version = ...`
(optimistic locking), nên hai request đồng thời không ghi đè trạng thái của nhau. Hủy đơn từ
`PENDING` hoặc `PAYMENT_FAILED` hoàn nguyên liệu và hoàn điểm đã dùng đúng một lần trong cùng
transaction; đơn đã `PAID` nếu bị hủy ở mức state machine được đánh dấu cần hoàn tiền thủ công
(`refundStatus = MANUAL_REQUIRED`). Nhánh `PAID → CANCELLED` chỉ tồn tại trong state machine theo
đề bài, ngoài phạm vi MVP (không có UI/endpoint và không tự hoàn tiền). Ngoài hủy thủ công, một
cron chạy mỗi phút tự hủy các đơn `PENDING` quá 15 phút và hoàn kho/điểm; cron nằm trong tiến
trình API nên không scale backend lên nhiều instance khi còn dùng cơ chế này.

### 6.2 Giao diện thực tế

Hình 7–12 là ảnh chụp giao diện thật trên Chromium tại hai kích thước 390×844 (mobile) và
1440×900 (desktop). Các màn hình khách gồm menu, chi tiết/size/topping, giỏ hàng, đăng nhập,
checkout (điểm và voucher), chọn ZaloPay, liên kết ZaloPay, lịch sử và chi tiết đơn; khu quản trị
gồm tổng quan, đơn hàng, kho nguyên liệu và công thức. Ảnh dùng đúng dữ liệu seed và tài khoản
demo, không dựng mockup.

### 6.3 Task 5.2 — Tích hợp và kiểm thử

**Kiểm thử tự động.** Bộ kiểm thử dùng `node:test` có sẵn, không thêm framework ngoài. Backend có
15 tệp với 49 test; frontend có 5 tệp với 10 test; E2E HTTP có 1 kịch bản. Test backend chạy trên
schema PostgreSQL dùng một lần (`PAYMENT_TEST_DATABASE_URL`), không gọi mạng ZaloPay. E2E chỉ chạy
khi khai báo `E2E_API_URL`; nếu không có biến này, test tự bỏ qua để CI/local vẫn chạy được. Bảng
26 nhóm các tệp theo phạm vi, Bảng 27 ghi kết quả chạy tại thời điểm chốt Sprint 2.

**Bảng 26: Nhóm kiểm thử và phạm vi**

| Nhóm | Nội dung kiểm chứng | Tệp / số test |
|---|---|---|
| Sản phẩm và menu | Danh sách công khai, chi tiết, size hết hàng, quyền admin khi sửa sản phẩm | `products.test.cjs` (7), `product-access.test.cjs` (1) |
| Giỏ hàng và xác thực | Giỏ theo người dùng, chặn ghi chéo, hồ sơ, đổi email/mật khẩu, JWT | `cart.test.cjs` (3), `auth-profile.test.cjs` (5) |
| Đơn hàng và state machine | Tạo đơn, tính giá server-side, chuỗi trạng thái, hủy, hoàn kho/điểm, lịch sử, phân quyền | `orders.test.cjs` (11), `orders-integration.test.cjs` (5) |
| Tồn kho và công thức | Giữ/hoàn nguyên liệu theo size, xung đột đồng thời, công thức đổi sau khi đặt | `ingredient-reservation.test.cjs` (2) |
| Thanh toán và idempotency | Cùng key trả kết quả cũ, khác payload trả `409`, request đồng thời, ZaloPay hủy/không xác định | `payment-idempotency.test.cjs` (3), `zalopay-change-method.test.cjs` (3) |
| Khuyến mãi và loyalty | Voucher theo thời hạn/giá trị đơn; cộng/hoàn điểm đúng một lần | `promotions.test.cjs` (1) |
| Quản trị | Đơn admin, người dùng, nguyên liệu/công thức, thứ tự trạng thái | `admin-flow.test.cjs` (3), `admin-user-integration.test.cjs` (1), `ingredient-integration.test.cjs` (1) |
| Luồng lõi và giới hạn request | Đăng ký → đặt → hủy → đổi mật khẩu qua HTTP; giới hạn tần suất ghi | `core-flow.test.cjs` (2), `request-limits.test.cjs` (1) |

**Bảng 27: Kết quả chạy kiểm thử và build**

| Hạng mục | Lệnh | Kết quả |
|---|---|---|
| Backend | `cd apps/api && npm test` | 49/49 test đạt |
| Frontend | `cd apps/web && npm test` | 10/10 test đạt |
| E2E HTTP | `E2E_API_URL=... node --test tests/e2e` | 1/1 kịch bản đạt (menu → chi tiết → đặt đơn → lịch sử → hủy) |
| Build API | `cd apps/api && npm run build` | Đạt |
| Build web | `cd apps/web && npm run build` | Đạt |
| Lint web | `cd apps/web && npm run lint` | Đạt |
| CI | `.github/workflows/ci.yml` trên `main` | Chạy hai job frontend/backend; là điều kiện merge theo quy trình của nhóm |
| CD | `.github/workflows/cd.yml` sau CI xanh trên `main` | Migration (tuỳ chọn) → Render đúng commit → smoke API → Vercel → smoke web; rollback khi smoke test lỗi |

Backend chưa có script `lint` riêng; CI dùng `npm run lint --if-present` nên bước lint backend
được bỏ qua, còn frontend có ESLint và chạy thật. Đây là khoảng trống nhỏ cần bổ sung nếu muốn
quality gate chặt hơn.

**Migration, seed và Docker Compose.** Chạy toàn bộ hệ thống bằng `docker compose up --build -d`
(PostgreSQL 16, API, web). Container backend tự chạy `prisma migrate deploy` trước khi start
`node dist/src/main`; nhờ vậy schema production và local đi cùng một chuỗi migration. Seed dữ liệu
mẫu bằng `docker compose exec backend npx prisma db seed`; lệnh seed xóa dữ liệu cũ trước khi tạo
2 tài khoản, 8 sản phẩm, 24 nguyên liệu, 105 dòng công thức và 2 voucher. Trên production, seed
chạy một lần từ máy local trỏ vào Neon hoặc qua Render Shell.

**Health check.** `GET /api/v1/health` trả `{ "success": true, "statusCode": 200, "data": { "status": "ok", "service": "brewlite-api" }, "timestamp": "..." }` (bọc bởi `TransformInterceptor`). Đây là liveness probe nhẹ, **không truy vấn database**; `cd.yml` kiểm tra `data.status = "ok"` sau deploy, còn workflow keep-alive (`.github/workflows/keepalive.yml`, mỗi 5 phút) dùng cùng endpoint để giữ Render Free thức. Vì không kiểm tra DB, smoke test cần gọi thêm một endpoint đọc dữ liệu (ví dụ `GET /products`) nếu muốn xác nhận kết nối Neon trong checklist thủ công.

**Đo hiệu năng production.** Năm lượt đo trên production sau khi dịch vụ đã thức cho các endpoint
đọc mẫu (`/products`, `/products/:id`, `/orders/me`) đạt trung vị 81–182 ms tùy endpoint, tối đa
194 ms, dưới ngưỡng 500 ms của NFR-01. Đây là đo thủ công bằng Postman, không phải test hiệu năng
tự động trong CI. Cold start của Render Free (khi dịch vụ ngủ) mất khoảng 30–60 giây, không nằm
trong con số trung vị ở trên.

### 6.4 Task 5.3 — Continuous Delivery/Deployment

**Hiện trạng: có pipeline CD tự động tại `.github/workflows/cd.yml`.** Pipeline chạy sau CI chứ
không chạy song song, gồm các bước:

- **Kích hoạt:** `workflow_run` khi workflow **BrewLite CI** của một push vào `main` kết thúc với
  `conclusion = success`, hoặc chạy tay bằng `workflow_dispatch`. Push lên nhánh khác và CI đỏ
  không kích hoạt CD.
- **Kiểm tra commit:** so SHA vừa được test với HEAD hiện tại của `main`; nếu commit đã cũ thì bỏ
  qua để không deploy đè lên commit mới hơn.
- **Migration (tuỳ chọn):** nếu khai báo secret `PROD_DATABASE_URL`, pipeline chạy `npm ci` rồi
  `npx prisma migrate deploy` trước khi deploy; nếu không, container Render vẫn tự chạy migration
  lúc khởi động (`CMD` trong `apps/api/Dockerfile`).
- **Deploy API:** gọi Render API `POST /services/{id}/deploys` với đúng `commitId`; nếu Render
  Auto-Deploy đã tạo deployment cho commit đó thì dùng lại thay vì tạo bản trùng; chờ trạng thái
  `live` tối đa khoảng 15 phút.
- **Smoke test API:** gọi `GET /api/v1/health`, yêu cầu `data.status = "ok"`, lặp 12 lần cách
  10 giây để chịu cold start của Render Free.
- **Deploy/xác minh frontend:** gọi `VERCEL_DEPLOY_HOOK` nếu có; nếu có `VERCEL_TOKEN` thì chờ
  deployment đúng SHA đạt `READY`; nếu không có token thì chỉ chạy smoke test URL.
- **Smoke test web:** `GET` trang chủ, yêu cầu HTTP 200 và HTML có chuỗi `brewlite`, lặp 30 lần
  cách 10 giây.
- **Rollback tự động:** nếu smoke test API lỗi, gọi `POST /services/{id}/rollback` về deployment
  `live` trước đó; nếu smoke test web lỗi và có `VERCEL_TOKEN`, gọi rollback Vercel về deployment
  production trước. Rollback chỉ chạy khi smoke test thất bại; lỗi build hoặc migration thì dừng
  trước khi đổi traffic, bản cũ vẫn phục vụ.
- **Tổng kết:** ghi bảng trạng thái từng bước vào `GITHUB_STEP_SUMMARY`; `concurrency:
  cd-production` bảo đảm hai lần deploy không chồng nhau.

**Secret và biến cấu hình.** Bắt buộc `RENDER_API_KEY`; tuỳ chọn `PROD_DATABASE_URL`,
`VERCEL_TOKEN`, `VERCEL_DEPLOY_HOOK`. Có thể override `API_BASE_URL`, `WEB_URL`,
`RENDER_SERVICE_ID`, `VERCEL_PROJECT_ID`, `VERCEL_TEAM_ID` bằng Variables; nếu không khai báo,
workflow dùng giá trị của môi trường demo.

**Bảng 28: Đối chiếu bảy yêu cầu pipeline CD của đề với hiện trạng**

| # | Yêu cầu | Hiện trạng |
|---|---|---|
| 1 | Quality gate: lint, test, build trước khi phát hành | **Đạt một phần** — `cd.yml` chỉ chạy khi CI xanh và kiểm tra commit còn là HEAD của `main`; nhưng Render/Vercel vẫn bật Auto-Deploy nên có thể phát hành trước khi CI kết thúc nếu không tắt Auto-Deploy |
| 2 | Đóng gói image từ commit đã test | **Một phần** — Render build `apps/api/Dockerfile` từ đúng commit; không gắn tag image riêng |
| 3 | Đẩy image lên registry | **Chưa** — không dùng GHCR/Docker Hub; Render build trực tiếp từ Git |
| 4 | Deploy tự động | **Đạt** — Render API theo `commitId`; Vercel deploy hook/Git integration, có chờ deployment đúng SHA khi khai báo token |
| 5 | Migration cơ sở dữ liệu | **Đạt một phần** — có bước `prisma migrate deploy` trong CD nếu khai báo `PROD_DATABASE_URL`; nếu không, migration nằm trong container start nên không bảo đảm xong trước khi đổi traffic |
| 6 | Smoke test sau deploy | **Đạt ở mức cơ bản** — tự động `/health` và trang chủ; chưa kiểm đăng nhập/tạo đơn/thanh toán, các bước đó vẫn theo checklist thủ công |
| 7 | Rollback | **Đạt một phần** — tự động khi smoke test thất bại; lỗi build/migration không rollback vì bản cũ vẫn chạy; vẫn có thể rollback tay |

**Phần chưa tự động (ghi rõ để tránh hiểu nhầm).**

- Không đẩy image lên registry và không có image tag theo release; Render build trực tiếp từ Git.
- Migration chỉ do pipeline điều khiển khi khai báo `PROD_DATABASE_URL`; mặc định vẫn chạy trong
  container start.
- Smoke test mới ở mức liveness và trang chủ, chưa đi hết luồng người dùng; checklist mục 6.5 vẫn
  làm tay.
- Rollback tự động chỉ gắn với smoke test. Rollback của Render không tắt Auto-Deploy, nên một
  auto-deploy sau đó có thể ghi đè bản vừa rollback.
- Chạy tay `workflow_dispatch` không qua CI — dùng có chủ đích để redeploy sau khi đổi biến môi
  trường.
- Chưa có E2E trình duyệt (Playwright/Cypress) trong pipeline; E2E hiện tại chỉ là HTTP và chỉ chạy
  khi có `E2E_API_URL`.
- Frontend chỉ được xác minh đầy đủ khi khai báo `VERCEL_TOKEN` hoặc `VERCEL_DEPLOY_HOOK`.

### 6.5 Task 5.4 — Triển khai production và bàn giao

**Bảng 29: Địa chỉ bàn giao**

| Hạng mục | URL / ghi chú |
|---|---|
| Frontend | https://brewlite-acme-1b6f1.vercel.app |
| API | https://brewlite-api-u2jb.onrender.com/api/v1 |
| Health check | https://brewlite-api-u2jb.onrender.com/api/v1/health |
| Cơ sở dữ liệu | Neon PostgreSQL (Singapore), không mở cổng công khai; API truy cập qua `DATABASE_URL` có SSL |
| Thanh toán | ZaloPay Sandbox (`app_id=2554`); không dùng tiền thật |
| Mã nguồn | GitHub monorepo `apps/web`, `apps/api`, `docs/`, `tests/` |
| CI | GitHub Actions, workflow `.github/workflows/ci.yml` |
| CD | GitHub Actions, workflow `.github/workflows/cd.yml` (chạy sau CI xanh trên `main`) |

Hai tài khoản seed dùng cho chấm bài: khách hàng `demo@brewlite.test / Demo@12345` (có sẵn 120
điểm loyalty) và quản trị `admin@brewlite.test / Admin@12345`. Đây là tài khoản demo trên môi
trường sandbox, không phải người dùng thật.

**Ghi chú phát hành v1.0.0.** Repo hiện chưa tạo git tag; bản nộp được đánh dấu bằng commit SHA
trên `main`. Nếu nhóm tạo tag `v1.0.0` trước khi nộp, tag phải trỏ đúng commit đã chạy CD xanh.

- Luồng end-to-end: menu → chi tiết/size/topping → giỏ → đăng nhập → tạo đơn → ZaloPay Sandbox →
  xác nhận/lịch sử đơn.
- Thanh toán idempotent, callback/`sync`/`cancel`, đối soát giao dịch ở `/admin/payments`.
- State machine bảy trạng thái, kiểm soát tồn kho, voucher và điểm loyalty.
- 49 test backend + 10 test frontend + 1 E2E HTTP; build và lint chạy trong CI.
- Triển khai Vercel + Render + Neon; CI là cổng merge, CD tự động chạy sau CI xanh với smoke
  test và rollback khi smoke test lỗi.
- Hạn chế đã biết: chưa đẩy image lên registry/image tag; smoke test mới phủ `/health` và trang
  chủ; rollback chỉ tự động khi smoke test lỗi; Render Free cold start 30–60 giây; chưa có E2E
  trình duyệt.

**Bảng 30: Sprint Retrospective**

| Điểm | Nội dung |
|---|---|
| Đã làm tốt | Khép kín được luồng thanh toán sandbox và state machine; bộ test backend/frontend phủ các điểm dễ sai (idempotency, tồn kho, hủy đơn); dựng được CD chạy sau CI với deploy đúng commit, smoke test và rollback khi smoke lỗi; tài liệu yêu cầu – sơ đồ – truy vết khớp nhau; phân công A/B/C rõ ràng |
| Chưa tốt | Chưa đóng gói/đẩy image lên registry và chưa có image tag; Render/Vercel vẫn bật Auto-Deploy nên có thể phát hành trước khi CI xong; smoke test mới phủ `/health` và trang chủ; chưa có E2E trình duyệt; cuối sprint thời gian gấp nên một số bảng trong báo cáo phải bổ sung muộn |
| Hành động | Tắt Auto-Deploy của Render/Vercel để CD là cổng duy nhất; thêm bước đóng gói image + tag + registry; mở rộng smoke test sang đăng nhập/tạo đơn/thanh toán sandbox; bổ sung Playwright vào CI; tách keep-alive/cron khỏi tiến trình API; chốt checklist phát hành trước mỗi lần nộp |

**Video demo 3–5 phút:** nhóm quay luồng đăng nhập → chọn món → đặt hàng → thanh toán ZaloPay →
xem lịch sử → admin đổi trạng thái. Link video cần được điền trước khi nộp; nếu chưa có, ghi rõ
“chưa có trong repo” thay vì mô tả như đã có.

---

## 7. Ma trận truy vết yêu cầu

Mỗi yêu cầu chức năng được truy vết theo đúng mẫu của đề: **mã yêu cầu → use-case/user story →
thiết kế/sơ đồ → code/API → test**. Cột Test dùng mã scenario `TS-...` hoặc tên tệp test thật;
các ô ghi “thủ công” là kiểm tra theo checklist, không có test tự động. Bảng 31 truy vết 12 yêu
cầu chức năng, Bảng 32 truy vết các yêu cầu phi chức năng.

**Bảng 31: Truy vết yêu cầu chức năng**

| Mã yêu cầu | Use-case / User story | Thiết kế / Sơ đồ | Code / API | Test |
|---|---|---|---|---|
| FR-01 | US-01, US-02; UC Menu | UseCase-ProductCatalog; Activity-ProductCatalog | `GET /products`; `apps/api/src/modules/products/`; `apps/web/src/app/menu/`, `lib/menu-filter.ts` | `products.test.cjs` (7), `product-access.test.cjs` (1), `menu-filter.test.mjs` (1); TS-FR-01-01…07 |
| FR-02 | US-03; UC Product Detail | UseCase-ProductDetail; Activity-ProductDetail; Class-Product/ProductSizePrice/Topping | `GET /products/:id`; `products.service.ts`; `apps/web/src/app/products/[id]/` | `products.test.cjs` (size hết hàng); TS-FR-02-01…06 (03/04 unit frontend; 01/02/05/06 thủ công) |
| FR-03 | US-04; UC Cart | UseCase-Cart; Activity-Cart; Class-Cart/CartItem | `apps/web/src/lib/cart-items.ts`, `store/useCartStore.ts`, `lib/pending-order.ts`; `apps/api/src/modules/cart/` | `cart-items.test.mjs` (5), `cart.test.cjs` (3); TS-FR-03-01…07 |
| FR-04 | US-05; UC Auth | UseCase-Auth; Activity-Auth; Sequence-JWT-Auth; Class-User | `POST /auth/register`, `POST /auth/login`, `GET/PUT /auth/me`, `POST /auth/change-password`; `modules/auth/` | `auth-profile.test.cjs` (5), `core-flow.test.cjs`; TS-FR-04-01…09 |
| FR-05 | UC-01, US-06, US-07 | UseCase-Order; Activity-EndToEnd; Sequence-Checkout; Class-Order/OrderItem/Payment | `POST /orders`, `POST /payments/zalopay`; `modules/orders/`, `modules/payments/` | `orders.test.cjs` (create), `orders-integration.test.cjs`, `core-flow.test.cjs`, `tests/e2e/checkout-flow.test.mjs`; TS-FR-05-01…10 |
| FR-06 | US-08; UC Order History | UseCase-OrderHistory; Activity-OrderHistory; Class-Order | `GET /orders/me`, `GET /orders/:id`; `orders.controller.ts`; `apps/web/src/app/orders/` | `orders-integration.test.cjs` (history/detail), `orders.test.cjs` (history scopes); TS-FR-06-01…08 |
| FR-07 | US-10; UC Admin Order | StateMachine-Order (`docs/order/state-machine.md`); Class-Order | `PATCH /admin/orders/:id/status`, `POST /orders/:id/cancel`; `orders.service.ts` (`transition`, `cancel`, cron hủy đơn quá 15 phút) | `orders.test.cjs` (state machine, cancel/points), `orders-integration.test.cjs` (prep vs cancel, payment vs cancel, expiry), `admin-flow.test.cjs`; TS-FR-07-01…09 |
| FR-08 | US-07; UC Payment | Sequence-Payment; Class-Payment | `POST /payments/zalopay` (`Idempotency-Key`), `POST /payments/zalopay/:id/sync`, `POST /payments/zalopay/callback`, `POST /payments/zalopay/:id/cancel` | `payment-idempotency.test.cjs` (3), `zalopay-change-method.test.cjs` (3); TS-FR-08-01…05 |
| FR-09 | US-06; UC Order + Inventory | Activity-EndToEnd; Class-RecipeIngredient/Ingredient/StockImport | `orders.service.ts` (reserve/restore); `modules/ingredients/`, `modules/recipes/`, `modules/stock-imports/` | `ingredient-reservation.test.cjs` (2), `orders.test.cjs` (reserve), `orders-integration.test.cjs` (concurrent), `core-flow.test.cjs`; TS-FR-09-01,03,04; TS-E2E-STOCK-01 |
| FR-10 | US-09; UC Checkout | Activity-Checkout; Class-Promotion/LoyaltyTransaction | `orders.service.ts` (voucher/points); `apps/web/src/app/checkout/page.tsx` | `promotions.test.cjs` (1), `orders.test.cjs` (redeem/refund points), `promotion-checkout.test.mjs` (2); TS-FR-10-01,03…06 |
| FR-11 | US-10, US-11, US-12; UC Admin | UseCase-Overall (Admin); Activity diagrams theo module; Class-Domain | `admin/*` (orders, payments, users), `products/`, `ingredients/`, `recipes/`, `stock-imports/`; `apps/web/src/app/admin/` | `admin-flow.test.cjs` (3), `admin-user-integration.test.cjs` (1), `ingredient-integration.test.cjs` (1); TS-FR-11 (checklist thủ công) |
| FR-12 | US-08; UC Order History | Activity-OrderHistory; Class-Order | Polling 15 giây ở `apps/web/src/app/orders/`; thông báo lỗi tiếng Việt ở các trang | TS-FR-12 (thủ công) |

**Bảng 32: Truy vết yêu cầu phi chức năng**

| Mã | Thuộc tính | Thiết kế / cách kiểm chứng | Bằng chứng |
|---|---|---|---|
| NFR-01 | Hiệu năng | Index Prisma; đo 5 lượt trên production sau khi dịch vụ thức | Trung vị 81–182 ms, tối đa 194 ms, mục tiêu < 500 ms; đo thủ công, không có test tự động |
| NFR-02 | Bảo mật | JWT + role guard, bcrypt, DTO validation, `timingSafeEqual` cho MAC ZaloPay | `auth-profile.test.cjs`, `orders-integration.test.cjs` (401/403/404), `core-flow.test.cjs`; TS-FR-04-06…08, TS-NFR-02-04/05 |
| NFR-03 | Tương thích | Tailwind responsive; kiểm tra 390×844 và 1440×900 | Hình 7–12 (14 ảnh trong báo cáo, 16 ảnh nguồn); TS-NFR-03-01 (thủ công trên Chromium; chưa có test đa trình duyệt) |
| NFR-04 | Toàn vẹn dữ liệu | Transaction Serializable, optimistic lock, UNIQUE `Idempotency-Key` | `orders.test.cjs`, `orders-integration.test.cjs`, `payment-idempotency.test.cjs`, `ingredient-reservation.test.cjs` |
| NFR-05 | Khả dụng | Loading/empty/error; hộp thoại xác nhận thao tác nguy hiểm | Ảnh giao diện; TS-NFR-05 (thủ công) |
| NFR-06 | Bảo trì | TypeScript strict, 9 module, tài liệu API/DB/ADR | `npm run build` (type check), `docs/` |
| NFR-07 | Kiểm thử | 49 backend + 10 frontend + 1 E2E HTTP; build/lint trong CI; CD chỉ chạy sau CI xanh | `.github/workflows/ci.yml`, `.github/workflows/cd.yml`; kết quả Bảng 27 |
| NFR-08 | Cấu hình | Biến môi trường, `.env.example`, không commit secret | `.gitignore`, `.env.example`; review thủ công |
| NFR-09 | Khả năng triển khai | `docker compose up`; HTTPS; `/health`; CD tự động sau CI | `docker-compose.yml`, `docs/deployment.md`, `.github/workflows/cd.yml`, URL production |

**Tính đầy đủ.** Cả 12/12 yêu cầu chức năng đều có ít nhất một mắt xích code/API và một test tự
động hoặc checklist thủ công; không có yêu cầu nào chỉ tồn tại trên giấy. Cả chín NFR đều có bằng
chứng nhưng mức độ khác nhau: NFR-02/04/06/07/09 có kiểm chứng tự động hoặc kiểm tra được bằng cấu
hình; NFR-01 đo thủ công bằng Postman; NFR-03/05/08 kiểm theo checklist, trong đó NFR-03 mới thử
trên Chromium ở hai kích thước và chưa phủ đủ bốn trình duyệt. Các khoảng trống được ghi nhận trung
thực: chưa có E2E trình duyệt, NFR-01 đo thủ công, FR-11/FR-12 kiểm theo checklist.

---

## Kết luận

**Kết quả đạt được.** Báo cáo đã khép kín chuỗi yêu cầu → mô hình hóa → kiến trúc → hai sprint →
CI/CD → production. Sản phẩm có 12 yêu cầu chức năng và 9 yêu cầu phi chức năng được đặc tả, 49 test
backend, 10 test frontend và 1 kịch bản E2E HTTP; ba địa chỉ production (web, API, health) truy
cập được qua HTTPS. Luồng cốt lõi chạy thật với ZaloPay Sandbox: tạo đơn, thanh toán, callback/sync,
state machine, trừ/hoàn kho, voucher và điểm loyalty. CI chạy trên `main` và là cổng merge của
nhóm; CD tự động chạy sau CI xanh, deploy đúng commit đã test, smoke test API/trang chủ và rollback
khi smoke test thất bại.

**Hạn chế.** CD chưa phủ hết chuỗi phát hành: chưa đóng gói/đẩy image lên registry và chưa có
image tag; migration chỉ do pipeline điều khiển khi khai báo `PROD_DATABASE_URL`, mặc định vẫn chạy
lúc container start; smoke test mới kiểm `/health` và trang chủ; rollback tự động chỉ chạy khi smoke
test lỗi. Render/Vercel vẫn bật Auto-Deploy nên có thể phát hành trước khi CI kết thúc nếu không tắt.
Ngoài ra, chưa có E2E trình duyệt, Render Free có cold start 30–60 giây và phạm vi nghiệp vụ mới ở
mức một quán, thanh toán sandbox.

**Hướng phát triển.** Tắt Auto-Deploy để CD là cổng duy nhất; thêm bước đóng gói image + tag +
registry, migration có kiểm soát trước khi đổi traffic, mở rộng smoke test sang đăng nhập/tạo
đơn/thanh toán sandbox và rollback cho mọi loại lỗi; thêm Playwright vào CI; nâng gói hạ tầng hoặc
tách keep-alive/cron khỏi tiến trình API; mở rộng giao hàng, đa chi nhánh và tích hợp
thanh toán thật khi có hợp đồng merchant.
