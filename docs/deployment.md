# Triển khai và vận hành – BrewLite

> **Trạng thái hiện tại:** dự án chạy được end-to-end bằng Docker ở môi trường local và có
> CI trên nhánh `main`. **Chưa có môi trường production công khai** vì chưa có tài khoản
> hosting/domain và bộ khoá ZaloPay merchant. Tài liệu này mô tả quy trình đã kiểm chứng ở
> local, cấu hình CI thực tế, và quy trình triển khai/rollback mục tiêu để dùng khi có môi trường.

## 1. Môi trường

| Môi trường | Frontend | Backend | Database | Thanh toán |
|---|---|---|---|---|
| Local | Next.js `:3000` | NestJS `:4000` | PostgreSQL Docker `:5433` | ZaloPay Sandbox (tuỳ chọn) |
| CI (`main`) | Build tĩnh | Build + test | PostgreSQL 16 service | Không gọi mạng ZaloPay |
| Production (mục tiêu) | Vercel/static host | Container (Railway/Render/VM) | PostgreSQL managed | ZaloPay merchant chính thức |

## 2. Yêu cầu môi trường

- Docker Desktop + Docker Compose v2 (local).
- Node.js 22 và npm 10 (chạy test/build không dùng Docker).
- PostgreSQL 16 nếu chạy backend ngoài Docker.
- Tài khoản ZaloPay Sandbox với `app_id`, `key1`, `key2` nếu muốn thanh toán thật ở mức sandbox.

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
| `DATABASE_URL` | Có | Chuỗi kết nối PostgreSQL |
| `JWT_SECRET` | Có | Khoá ký JWT, tối thiểu 32 ký tự ở production |
| `JWT_EXPIRATION` | Không | Mặc định `7d` |
| `NODE_ENV` | Có | `development` / `test` / `production` |
| `PORT` | Không | Mặc định `4000` |
| `PAYMENT_ADMIN_USER_IDS` | Không | Danh sách `users.id` được quản lý thanh toán, phân tách bằng dấu phẩy |
| `ZALOPAY_SANDBOX_ENABLED` | Không | `true` mới bật sandbox; luôn bị từ chối ngoài `development`/`test` |
| `ZALOPAY_APP_ID` | Khi bật sandbox | App ID sandbox |
| `ZALOPAY_KEY1` | Khi bật sandbox | Khoá ký request |
| `ZALOPAY_KEY2` | Khi bật sandbox | Khoá xác thực callback |
| `ZALOPAY_CALLBACK_URL` | Không | URL HTTPS công khai tới `/api/v1/payments/zalopay/callback` |
| `ZALOPAY_REDIRECT_URL` | Khi bật sandbox | Gốc frontend; backend thêm `/orders/:id/payment` |
| `NEXT_PUBLIC_API_URL` | Frontend | Mặc định `http://localhost:4000/api/v1` |

Không commit `.env`. Chỉ commit `.env.example` với giá trị rỗng/giả.

## 5. CI trên nhánh `main`

`.github/workflows/ci.yml` chạy khi push hoặc mở pull request vào `main`:

1. Checkout mã nguồn, cài Node.js 22.
2. Khởi động PostgreSQL 16 service với database `brewlite_test`.
3. Backend: `npm ci` → `prisma generate` → `prisma migrate deploy` → `npm test` → `npm run build`.
4. Frontend: `npm ci` → `npm run build` (bao gồm type check của Next.js).

Test backend dùng schema PostgreSQL riêng qua `PAYMENT_TEST_DATABASE_URL`; test không gọi
mạng ZaloPay. Nếu CI đỏ, không merge vào `main`.

## 6. Quy trình triển khai production (mục tiêu)

### 6.1. Chuẩn bị

1. Tạo PostgreSQL managed; bật backup tự động và SSL.
2. Tạo secret production: `DATABASE_URL`, `JWT_SECRET`, cấu hình ZaloPay.
3. Chọn host backend **chạy tiến trình dài** (container/VM). Không dùng serverless thuần vì
   `OrdersService` có `@Cron(EVERY_MINUTE)` hủy đơn quá hạn.
4. Cấu hình `NEXT_PUBLIC_API_URL` trỏ tới domain API HTTPS.

### 6.2. Triển khai backend

```powershell
cd backend
npm ci
npx prisma generate
npx prisma migrate deploy
npm run build
npm run start:prod        # hoặc build Docker image và deploy
```

Kiểm tra `GET /api/v1/health` trả `200` trước khi chuyển traffic.

### 6.3. Triển khai frontend

```powershell
cd frontend
npm ci
npm run build
npm run start             # hoặc deploy lên Vercel/static host
```

### 6.4. Cấu hình callback ZaloPay

- `ZALOPAY_CALLBACK_URL=https://<api-domain>/api/v1/payments/zalopay/callback`
- `ZALOPAY_REDIRECT_URL=https://<web-domain>`
- Callback phải là HTTPS, không có port lạ, không chứa query/hash.
- Nếu chưa có URL công khai, để trống callback và dựa vào polling `sync` từ frontend.

### 6.5. Smoke test sau deploy

| Bước | Kỳ vọng |
|---|---|
| `GET /api/v1/health` | `200`, `status: ok` |
| Đăng nhập tài khoản seed | Nhận JWT, vào được `/menu` |
| Tạo đơn từ menu | Đơn `PENDING`, tồn kho giảm |
| Tạo giao dịch ZaloPay | `201`, có `paymentUrl` |
| Hoàn tất thanh toán sandbox | `sync`/callback → đơn `PAID`, điểm cộng một lần |
| Admin `/admin/payments` | Thấy giao dịch, đồng bộ được trạng thái |
| Hủy đơn chưa thanh toán | `CANCELLED`, tồn kho và điểm hoàn đúng |

## 7. Rollback

### 7.1. Ứng dụng

- **Frontend (Vercel/static):** dùng “Instant Rollback” về deployment trước, hoặc deploy lại
  commit/tag ổn định gần nhất.
- **Backend (container):** giữ image theo tag commit (`brewlite-api:<sha>`); rollback bằng cách
  deploy lại tag trước. Không build đè tag cũ.
- **VM:** giữ bản release trước trong thư mục riêng và symlink `current`; đổi symlink rồi
  restart service.

### 7.2. Cơ sở dữ liệu

- Migration được viết **forward-only** và phải tương thích ngược một phiên bản.
- Trước migration production: tạo snapshot/backup.
- Nếu migration gây lỗi: rollback ứng dụng trước, xác minh dữ liệu, rồi viết migration sửa
  tiếp theo. Chỉ restore backup khi mất toàn vẹn dữ liệu và đã chấp nhận mất giao dịch phát sinh.

### 7.3. Cấu hình

- Giữ bản sao biến môi trường của release trước (secret manager/versioned config).
- Khi tắt thanh toán khẩn cấp: đặt `ZALOPAY_SANDBOX_ENABLED=false`; API tạo giao dịch trả `503`,
  dữ liệu cũ không đổi.

## 8. Giám sát và vận hành

- Log backend dạng JSON của NestJS; theo dõi lỗi `503` từ ZaloPay và callback `return_code != 1`.
- Kiểm tra định kỳ các payment có `reviewReason` trong `/admin/payments` (sai tiền, trùng mã,
  đơn đã hủy).
- Cron mỗi phút hủy đơn `PENDING` quá hạn và hoàn tồn kho/điểm.
- Sao lưu database hằng ngày; thử restore định kỳ.

## 9. Hạn chế đã biết

- Chưa có môi trường production thực tế; mục 6 là quy trình mục tiêu đã đối chiếu với mã nguồn.
- ZaloPay Sandbox không đại diện đầy đủ hợp đồng merchant production (hạn mức, đối soát, hoàn tiền).
- Chưa có E2E trình duyệt tự động; smoke test mục 6.5 đang thực hiện thủ công.
- Tồn kho của đơn bỏ dở chỉ được giải phóng khi cron hủy hoặc khách hủy.
