# Triển khai và vận hành – BrewLite

> **Trạng thái:** đã triển khai demo công khai bằng **Vercel** (frontend) + **Render**
> (backend Docker, Free, Singapore) + **Neon** (PostgreSQL, Singapore). CI chạy trên
> nhánh `main`. ZaloPay Sandbox đã bật trên môi trường demo với bộ key sandbox công khai
> (`app_id=2554`); không dùng tiền thật.

| Thành phần | URL |
|---|---|
| Frontend | <https://brewlite-acme-1b6f1.vercel.app> |
| API | <https://brewlite-api-u2jb.onrender.com/api/v1> |
| Health check | <https://brewlite-api-u2jb.onrender.com/api/v1/health> |
| Render service | `srv-dbre87c9v7es73cb98u0` (workspace `tea-dbre3c5ckfvc73e0s500`) |
| Vercel project | `prj_Rqb03eNemvWHYK1hD5s0VJzcELX3` (root `frontend`) |

## 1. Môi trường

| Môi trường | Frontend | Backend | Database | Thanh toán |
|---|---|---|---|---|
| Local | Next.js `:3000` | NestJS `:4000` | PostgreSQL Docker `:5433` | ZaloPay Sandbox (tuỳ chọn) |
| CI (`main`) | Build + test | Build + test | PostgreSQL 16 service | Không gọi mạng ZaloPay |
| Production | Vercel | Render Web Service (Docker, Free) | Neon PostgreSQL (Free) | ZaloPay Sandbox (demo) |

## 2. Yêu cầu môi trường

- Docker Desktop + Docker Compose v2 (local).
- Node.js 22 và npm 10 (chạy test/build không dùng Docker).
- PostgreSQL 16 nếu chạy backend ngoài Docker.
- Tài khoản ZaloPay Sandbox với `app_id`, `key1`, `key2`.
- Tài khoản Vercel, Render và Neon (gói free đủ dùng cho demo).

## 3. Chạy local bằng Docker

```powershell
Copy-Item .env.example .env      # lần đầu
docker compose up --build -d
docker compose ps
```

- Frontend: <http://localhost:3000>
- API: <http://localhost:4000/api/v1>
- PostgreSQL: `localhost:5433` (đổi `POSTGRES_PORT` nếu trùng cổng).

Migration được áp dụng khi container backend khởi động (`prisma migrate deploy` trong
`backend/Dockerfile`). Seed dữ liệu mẫu:

```powershell
docker compose exec backend npx prisma db seed
```

Dừng mà giữ dữ liệu: `docker compose down`. Xoá cả volume: `docker compose down -v`
(chỉ dùng khi chấp nhận mất dữ liệu local).

### Chạy không dùng Docker

```powershell
# Terminal 1 – database
docker compose up -d postgres

# Terminal 2 – backend
cd backend
npm install
npx prisma migrate deploy
npx prisma db seed
npm run start:dev

# Terminal 3 – frontend
cd frontend
npm install
npm run dev
```

## 4. Biến môi trường

| Biến | Bắt buộc | Mô tả |
|---|---|---|
| `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL (Neon: thêm `sslmode=require`) |
| `JWT_SECRET` | Có | Khoá ký JWT, tối thiểu 32 ký tự ở production |
| `JWT_EXPIRATION` | Không | Mặc định `7d` |
| `NODE_ENV` | Có | `development` / `test` / `production` |
| `PORT` | Không | Render tự inject; local mặc định `4000` |
| `FRONTEND_URL` | Nên có | Domain frontend cho CORS, phân tách bằng dấu phẩy; trống = cho phép mọi origin |
| `PAYMENT_ADMIN_USER_IDS` | Không | Danh sách `users.id` được quản lý thanh toán, phân tách bằng dấu phẩy |
| `ZALOPAY_SANDBOX_ENABLED` | Không | `true` mới bật sandbox |
| `ZALOPAY_ALLOW_PUBLIC_SANDBOX` | Không | **Chỉ dùng cho demo**: cho phép sandbox khi `NODE_ENV` ngoài `development`/`test`. Mặc định `false` |
| `ZALOPAY_APP_ID` | Khi bật sandbox | App ID sandbox |
| `ZALOPAY_KEY1` | Khi bật sandbox | Khoá ký request |
| `ZALOPAY_KEY2` | Khi bật sandbox | Khoá xác thực callback |
| `ZALOPAY_CALLBACK_URL` | Không | URL HTTPS công khai tới `/api/v1/payments/zalopay/callback` |
| `ZALOPAY_REDIRECT_URL` | Khi bật sandbox | Gốc frontend; backend thêm `/orders/:id/payment` |
| `NEXT_PUBLIC_API_URL` | Frontend | URL API đầy đủ, ví dụ `https://<api>.onrender.com/api/v1` |

Không commit `.env`. Chỉ commit `.env.example` với giá trị rỗng/giả.

`ZALOPAY_ALLOW_PUBLIC_SANDBOX=true` không biến sandbox thành thanh toán thật, nhưng mở
đường tạo giao dịch thử nghiệm cho bất kỳ ai có link. Tắt cờ này sau khi demo/chấm bài.

## 5. CI trên nhánh `main`

`.github/workflows/ci.yml` chạy khi push hoặc mở pull request vào `main`:

1. Checkout mã nguồn, cài Node.js 22.
2. Khởi động PostgreSQL 16 service với database `brewlite_test`.
3. Backend: `npm ci` → `prisma generate` → `prisma migrate deploy` → `npm test` → `npm run build`.
4. Frontend: `npm ci` → `npm run lint` → `npm test` → `npm run build`.

Test backend dùng schema PostgreSQL riêng qua `PAYMENT_TEST_DATABASE_URL`; test không gọi
mạng ZaloPay. Nếu CI đỏ, không merge vào `main`.

## 6. Triển khai Vercel + Render

### 6.1. Chuẩn bị

1. **Neon**: tạo project PostgreSQL, region gần Việt Nam (Singapore), lấy connection string
   **direct/unpooled** dạng
   `postgresql://user:pass@ep-xxx.ap-southeast-1.aws.neon.tech/neondb?sslmode=require`.
   Không cần tạo bảng — backend tự chạy migration khi khởi động.
2. Sinh `JWT_SECRET` mạnh (32+ ký tự) và lưu cùng các khoá ZaloPay trong secret manager
   của Render, không gửi qua chat hay commit.
3. Xác nhận nhánh triển khai là `main` và CI đang xanh.

### 6.2. Backend trên Render

Tạo **Web Service** từ repo GitHub:

| Thiết lập | Giá trị |
|---|---|
| Branch | `main` |
| Runtime | Docker |
| Dockerfile Path | `backend/Dockerfile` |
| Docker Build Context | `backend` |
| Health Check Path | `/api/v1/health` |
| Plan | Free (demo) |
| Region | Singapore |

`backend/Dockerfile` tự chạy `npm ci`, `prisma generate`, `nest build`, rồi
`prisma migrate deploy` trước khi start `node dist/src/main`. Render inject `PORT`, ứng dụng
đã đọc biến này.

**Environment variables** (Render → Environment):

```
DATABASE_URL=postgresql://...neon.tech/neondb?sslmode=require
JWT_SECRET=<32+ ký tự>
JWT_EXPIRATION=7d
NODE_ENV=production
FRONTEND_URL=https://<vercel-domain>
PAYMENT_ADMIN_USER_IDS=<users.id của admin>
ZALOPAY_SANDBOX_ENABLED=true
ZALOPAY_ALLOW_PUBLIC_SANDBOX=true
ZALOPAY_APP_ID=<sandbox app id>
ZALOPAY_KEY1=<key1>
ZALOPAY_KEY2=<key2>
ZALOPAY_CALLBACK_URL=https://<render-domain>/api/v1/payments/zalopay/callback
ZALOPAY_REDIRECT_URL=https://<vercel-domain>
```

Seed dữ liệu (chạy một lần, từ máy local trỏ vào Neon hoặc qua Render Shell):

```powershell
cd backend
$env:DATABASE_URL='postgresql://...neon.tech/neondb?sslmode=require'
npx prisma migrate deploy
npx prisma db seed
```

Sau khi seed, lấy `users.id` của tài khoản admin và điền `PAYMENT_ADMIN_USER_IDS`, rồi restart.

### 6.3. Frontend trên Vercel

1. Import repo, **Root Directory** = `frontend`, framework Next.js.
2. Environment variable cho **Production + Preview**:
   `NEXT_PUBLIC_API_URL=https://<render-domain>/api/v1`.
3. Deploy. Biến `NEXT_PUBLIC_*` được nhúng lúc build, nên đổi API URL phải **Redeploy**.
4. Quay lại Render cập nhật `FRONTEND_URL` và `ZALOPAY_REDIRECT_URL` bằng domain Vercel thật.

### 6.4. Cấu hình callback ZaloPay

- `ZALOPAY_CALLBACK_URL=https://<render-domain>/api/v1/payments/zalopay/callback`
- `ZALOPAY_REDIRECT_URL=https://<vercel-domain>`
- Callback phải là HTTPS, không có port lạ, không chứa query/hash.
- Nếu chưa có URL công khai, để trống callback và dựa vào polling `sync` từ frontend.

### 6.5. Smoke test sau deploy

| Bước | Kỳ vọng |
|---|---|
| `GET https://<render-domain>/api/v1/health` | `200`, `data.status = ok` |
| `GET /payments/zalopay/config` bằng JWT | `{ enabled: true }` |
| Đăng nhập tài khoản seed trên Vercel | Nhận JWT, vào được `/menu` |
| Tạo đơn từ menu | Đơn `PENDING`, tồn kho giảm |
| Tạo giao dịch ZaloPay | `201`, có `paymentUrl` |
| Hoàn tất thanh toán sandbox | `sync`/callback → đơn `PAID`, điểm cộng một lần |
| Admin `/admin/payments` | Thấy giao dịch `ZALOPAY_SANDBOX`, đồng bộ được trạng thái |
| Hủy đơn chưa thanh toán | `CANCELLED`, tồn kho và điểm hoàn đúng |

### 6.6. Giữ dịch vụ Free thức

Render Free ngủ sau ~15 phút không có request, khiến cron hủy đơn và callback ZaloPay bị trễ.
Tạo monitor **UptimeRobot** (hoặc tương đương) gọi `GET /api/v1/health` mỗi **5 phút**.

Lưu ý free tier:

- Render Free có 750 giờ/tháng cho mỗi workspace; một service chạy liên tục đã dùng ~744 giờ.
- Neon Free tự suspend sau vài phút không hoạt động; request đầu tiên chậm hơn ~1 giây.
- Không scale backend lên nhiều instance khi còn dùng `@Cron` trong tiến trình (cron sẽ chạy trùng).

### 6.7. Kết quả triển khai (13/11/2026)

Đã tạo bằng Render API + Vercel MCP, không cần thao tác dashboard:

| Bước | Kết quả |
|---|---|
| Neon migrate | `prisma migrate deploy` áp dụng đủ migration |
| Neon seed | 2 user, 8 sản phẩm, 24 nguyên liệu, 105 dòng công thức, 2 voucher |
| Render build | Docker (`backend/Dockerfile`), health check `/api/v1/health` → `live` |
| Vercel build | Next.js 15.5.27, alias production `brewlite-acme-1b6f1.vercel.app` |
| `GET /health` | `200`, `data.status = ok` |
| Đăng nhập + `GET /orders/me` | `200`, thấy đơn đã tạo |
| Tạo đơn qua API | `201`, `PENDING`, tổng tiền tính đúng |
| Hủy đơn | `200`, `CANCELLED`, hoàn tồn kho |
| `GET /payments/zalopay/config` | `200`, `{ enabled: true }` |
| `POST /payments/zalopay` | `201`, có `paymentUrl` trỏ `qcgateway.zalopay.vn` |
| Admin `/admin/payments` | Thấy giao dịch `ZALOPAY_SANDBOX`, `PENDING`, `reconciliation=WAITING` |
| CORS | `Access-Control-Allow-Origin` trả đúng domain Vercel |
| Vercel Deployment Protection | đã tắt SSO cho production để link demo mở công khai |

Lưu ý khi vận hành lại:

- **Đổi biến môi trường trên Render cần trigger deploy mới** thì process mới đọc giá trị;
  riêng lần đầu, env cập nhật trong lúc build chưa được áp dụng cho container đã start.
- `next/font` có thể lỗi tạm thời khi build trên Vercel (`Cannot read properties of null`);
  deploy lại là được. Nếu lặp lại nhiều lần, chuyển font sang `next/font/local`.
- Project Vercel mặc định bật SSO Protection; tắt bằng
  `PATCH /v9/projects/{id}` với `{"ssoProtection": null}` nếu cần link công khai.
- `prisma db seed` **xoá dữ liệu cũ** trước khi tạo lại; chỉ chạy trên database mới.
- Service Render tạo qua API không có webhook GitHub, nên `autoDeploy=yes` vẫn không tự deploy
  khi push. Trigger thủ công:
  `POST https://api.render.com/v1/services/<service-id>/deploys` với header
  `Authorization: Bearer <RENDER_API_KEY>`, hoặc cài Render GitHub App trong dashboard để tự động.

## 7. Rollback

### 7.1. Ứng dụng

- **Frontend (Vercel):** “Instant Rollback” về deployment trước, hoặc deploy lại commit ổn định.
- **Backend (Render):** chọn deploy trước trong Deploy History và rollback; hoặc revert commit
  trên `main` để Render tự deploy lại. Không sửa tay image đang chạy.
- **VM:** giữ bản release trước trong thư mục riêng và symlink `current`; đổi symlink rồi
  restart service.

### 7.2. Cơ sở dữ liệu

- Migration **forward-only** và tương thích ngược một phiên bản.
- Trước migration production: tạo snapshot/backup (Neon có branch/restore).
- Nếu migration gây lỗi: rollback ứng dụng trước, xác minh dữ liệu, rồi viết migration sửa
  tiếp theo. Chỉ restore backup khi mất toàn vẹn dữ liệu và đã chấp nhận mất giao dịch phát sinh.

### 7.3. Cấu hình

- Giữ bản sao biến môi trường của release trước (Render Environment → có thể copy).
- Tắt thanh toán khẩn cấp: `ZALOPAY_SANDBOX_ENABLED=false` (hoặc
  `ZALOPAY_ALLOW_PUBLIC_SANDBOX=false` khi `NODE_ENV=production`); API trả `503`, dữ liệu cũ
  không đổi.

## 8. Giám sát và vận hành

- Log backend dạng JSON của NestJS; theo dõi lỗi `503` từ ZaloPay và callback `return_code != 1`.
- Kiểm tra định kỳ các payment có `reviewReason` trong `/admin/payments` (sai tiền, trùng mã,
  đơn đã hủy).
- Cron mỗi phút hủy đơn `PENDING` quá hạn và hoàn tồn kho/điểm.
- Sao lưu database hằng ngày; thử restore định kỳ.

## 9. Hạn chế đã biết

- ZaloPay Sandbox không đại diện đầy đủ hợp đồng merchant production (hạn mức, đối soát, hoàn tiền).
- `ZALOPAY_ALLOW_PUBLIC_SANDBOX=true` chỉ phù hợp demo; phải tắt khi không cần.
- Chưa có E2E trình duyệt tự động; smoke test mục 6.5 đang thực hiện thủ công.
- Tồn kho của đơn bỏ dở chỉ được giải phóng khi cron hủy hoặc khách hủy.
- Render Free ngủ khi không có traffic; UptimeRobot chỉ giảm thiểu, không đảm bảo SLA.
