# ☕ BrewLite – Hệ Thống Đặt Cà Phê Không Dùng Tiền Mặt

> **Môn học:** Công nghệ Phần mềm | **Học kỳ:** I – Năm học 2026–2027  
> **Kiến trúc:** Monorepo gồm **NestJS** (Backend REST API) + **Next.js** (Frontend App Router) + **PostgreSQL** (Docker)

---

## Chạy dự án bằng Docker

Mở Docker Desktop, sau đó chạy tại thư mục gốc:

```powershell
Copy-Item .env.example .env # chỉ tạo lần đầu
docker compose up --build -d
```

Mở http://localhost:3000; API ở http://localhost:4000/api/v1. Docker chạy cả frontend, backend và PostgreSQL; không cần chạy npm trên máy.

Nếu chạy backend trực tiếp bằng npm (không qua Docker), Prisma chỉ đọc `apps/api/.env`:
`Copy-Item .env.example apps/api/.env`.

Các cổng 3000, 4000 và 5433 phải còn trống. Nếu 5433 đã được sử dụng, đổi `POSTGRES_PORT` trong `.env` sang cổng trống. Nếu 3000 hoặc 4000 đã được sử dụng, dừng ứng dụng đang chiếm cổng trước khi chạy.

```powershell
docker compose ps
docker compose logs -f
docker compose down
```

Dữ liệu PostgreSQL được giữ trong volume khi dùng `docker compose down`. Sau khi thay đổi mã nguồn, chạy lại `docker compose up --build -d`.

---

## 📁 CẤU TRÚC MONOREPO

```
BrewLite/
├── apps/
│   ├── api/                  # NestJS API (Port 4000)
│   │   ├── src/
│   │   │   ├── common/       # Interceptor, Exception Filter
│   │   │   ├── modules/      # auth, products, orders, payments, cart, ...
│   │   │   └── prisma/       # Prisma service & client
│   │   ├── prisma/schema.prisma  # Định nghĩa CSDL PostgreSQL + migrations
│   │   └── test/             # Unit & integration test (node:test)
│   └── web/                  # Next.js App Router (Port 3000)
│       ├── src/
│       │   ├── app/          # Trang chủ, menu, giỏ hàng, đặt hàng
│       │   ├── components/   # ui/ (dùng chung) & features/ (nghiệp vụ)
│       │   └── lib/api-client.ts
│       └── tests/            # Unit test cho logic frontend
├── docs/                     # Tài liệu đồ án
│   ├── requirements/         # Task 1: bối cảnh, phạm vi, SRS
│   ├── diagrams/             # Task 2: activity, use-case, sequence
│   ├── architecture/adr/     # Task 3: kiến trúc + ADR
│   ├── deployment.md         # Triển khai, CI, rollback
│   ├── traceability-matrix.md
│   └── checklist-review.md   # Tiêu chí review code trước khi merge
├── tests/e2e/                # End-to-end: menu → đặt đơn → xác nhận
├── .github/workflows/        # CI, CD và keep-alive
├── docker-compose.yml        # PostgreSQL + API + Web
├── .env.example              # Mẫu biến môi trường
└── README.md
```

---

## 📌 QUY ƯỚC LÀM VIỆC DÀNH CHO THÀNH VIÊN
Mới vào dự án? Đọc [docs/README.md](docs/README.md) trước — bản đồ toàn bộ tài liệu, chọn đúng file cần đọc.

Trước khi bắt tay vào code các tính năng tiếp theo, tất cả thành viên bắt buộc đọc qua các tài liệu trong thư mục `docs/`:
1. [Quy chuẩn Git & Commit](docs/git-convention.md)
2. [Quy chuẩn đặt tên API & Database](docs/naming-convention.md)
3. [Checklist review code trước khi merge](docs/checklist-review.md)

## 📚 TÀI LIỆU ĐỒ ÁN

| Tài liệu | Nội dung |
|---|---|
| [Bối cảnh và phạm vi](docs/requirements/context-and-scope.md) | Actor, mục tiêu, trong/ngoài phạm vi |
| [SRS](docs/requirements/srs.md) | Yêu cầu chức năng FR-01 → FR-11, phi chức năng NFR |
| [Ma trận truy vết](docs/traceability-matrix.md) | Yêu cầu → thiết kế → mã nguồn → kiểm thử |
| [Kịch bản kiểm thử](docs/test-scenarios/test-scenarios.md) | Test case theo feature và E2E |
| [Hợp đồng API Payment](docs/payment/api-contract-payment.md) | ZaloPay Sandbox, callback, idempotency |
| [Triển khai và rollback](docs/deployment.md) | CI, môi trường, quy trình deploy, rollback |
| [ADR-001](docs/architecture/adr/001-monorepo.md) | Vì sao dùng monorepo |
| [ADR-002](docs/architecture/adr/002-payment-zalopay-sandbox.md) | Vì sao bỏ mock, chỉ dùng ZaloPay |
| [Sequence checkout](docs/diagrams/sequence-checkout.puml) | Luồng đặt hàng và thanh toán |
| [Sơ đồ triển khai](docs/architecture/deployment-diagram.puml) | Thành phần triển khai mục tiêu |

## 🚀 CI VÀ TRIỂN KHAI

- CI chạy trên nhánh `main` qua `.github/workflows/ci.yml`: PostgreSQL service → Prisma
  generate/migrate → test backend → lint/test/build `apps/web`.
- CD chạy sau khi CI xanh qua `.github/workflows/cd.yml`: áp migration (nếu có
  `PROD_DATABASE_URL`) → deploy Render đúng commit đã test → smoke test `/health` → xác minh
  deployment Vercel và smoke test trang chủ → tự rollback khi smoke test thất bại. Có thể
  phát hành lại thủ công bằng **Actions → BrewLite CD → Run workflow**.
- Secret cần khai báo trong **Settings → Secrets and variables → Actions**: `RENDER_API_KEY`
  (bắt buộc); `PROD_DATABASE_URL`, `VERCEL_TOKEN`, `VERCEL_DEPLOY_HOOK` (tuỳ chọn, xem
  [docs/deployment.md](docs/deployment.md) mục 5.1).
- Chạy local bằng Docker: `docker compose up --build -d`.
- Kiểm thử: unit ở `apps/web/tests` + `apps/api/test`, end-to-end ở `tests/e2e`
  (xem [tests/README.md](tests/README.md)).
- Quy trình deploy, biến môi trường và rollback: xem [docs/deployment.md](docs/deployment.md).
- **Môi trường demo công khai:**
  - Frontend: <https://brewlite-acme-1b6f1.vercel.app>
  - API: <https://brewlite-api-u2jb.onrender.com/api/v1> (health: `/health`)
  - Database: Neon PostgreSQL (Singapore), migrate + seed bằng Prisma.
- Cập nhật gần nhất: 16/11/2026 (thêm workflow CD, smoke test sau deploy và rollback tự động).
- Thanh toán chỉ dùng ZaloPay Sandbox; mock payment đã được gỡ (xem ADR-002). Trên môi trường
  demo, sandbox đã bật bằng bộ key sandbox công khai (`app_id=2554`); giao dịch tạo được
  `paymentUrl` và đối soát ở `/admin/payments`. Callback công khai có thể không được app demo
  gọi tới, khi đó dùng nút “Kiểm tra kết quả” (`sync`).

## Tài khoản test

Sau khi chạy `npm run prisma:seed` (hoặc `npx prisma db seed` trong `apps/api/`), hệ thống có sẵn 2 tài khoản trong `apps/api/prisma/seed.ts`:

| Vai trò | Email | Mật khẩu | Ghi chú |
|---|---|---|---|
| Khách hàng | `demo@brewlite.test` | `Demo@12345` | Có sẵn 120 điểm loyalty, đặt hàng bình thường |
| Quản trị viên | `admin@brewlite.test` | `Admin@12345` | Truy cập trang Admin (`/admin/users`, quản lý sản phẩm, đơn hàng, kho) |

> **Lưu ý:** Đây là tài khoản demo công khai chỉ dùng cho môi trường local/test. Không dùng mật khẩu này trên production. Nếu muốn đổi mật khẩu, hãy đăng nhập rồi đổi trong phần hồ sơ cá nhân.
