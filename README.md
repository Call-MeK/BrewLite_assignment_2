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
├── backend/                  # NestJS API (Port 4000)
│   ├── src/
│   │   ├── common/           # Interceptor, Exception Filter
│   │   ├── modules/          # auth, products, orders, payments
│   │   └── prisma/           # Prisma service & client
│   └── prisma/schema.prisma  # Định nghĩa CSDL PostgreSQL
├── frontend/                 # Next.js App Router (Port 3000)
│   ├── src/
│   │   ├── app/              # Trang chủ, menu, giỏ hàng, đặt hàng
│   │   ├── components/       # ui/ (dùng chung) & features/ (nghiệp vụ)
│   │   └── lib/api-client.ts # Fetch wrapper chuẩn hóa
├── docs/                     # Quy chuẩn làm việc nhóm
│   ├── requirements/         # Bối cảnh, phạm vi, SRS
│   ├── architecture/adr/     # Quyết định kiến trúc
│   ├── diagrams/             # Sequence diagram
│   ├── git-convention.md     # Quy tắc nhánh & commit
│   ├── naming-convention.md  # Tiêu chuẩn đặt tên API & DB
│   ├── deployment.md         # Triển khai, CI, rollback
│   ├── traceability-matrix.md
│   └── checklist-review.md   # Tiêu chí review code trước khi merge
├── Bai_2_UML/                # Tổng hợp sơ đồ UML bài tập
├── docker-compose.yml        # PostgreSQL container
├── .env.example              # Mẫu biến môi trường
└── README.md
```

---

## 📌 QUY ƯỚC LÀM VIỆC DÀNH CHO THÀNH VIÊN
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
  generate/migrate → test backend → build backend/frontend.
- Chạy local bằng Docker: `docker compose up --build -d`.
- Quy trình deploy, biến môi trường và rollback: xem [docs/deployment.md](docs/deployment.md).
- **Môi trường demo công khai:**
  - Frontend: <https://brewlite-acme-1b6f1.vercel.app>
  - API: <https://brewlite-api-u2jb.onrender.com/api/v1> (health: `/health`)
  - Database: Neon PostgreSQL (Singapore), migrate + seed bằng Prisma.
- Thanh toán chỉ dùng ZaloPay Sandbox; mock payment đã được gỡ (xem ADR-002). Trên môi trường
  demo, sandbox đang **tắt** cho tới khi cấu hình `ZALOPAY_APP_ID`/`KEY1`/`KEY2`; API trả `503`
  cho tạo giao dịch, các luồng khác hoạt động bình thường.

## Tài khoản test

Sau khi chạy `npm run prisma:seed` (hoặc `npx prisma db seed` trong `backend/`), hệ thống có sẵn 2 tài khoản trong `backend/prisma/seed.ts`:

| Vai trò | Email | Mật khẩu | Ghi chú |
|---|---|---|---|
| Khách hàng | `demo@brewlite.test` | `Demo@12345` | Có sẵn 120 điểm loyalty, đặt hàng bình thường |
| Quản trị viên | `admin@brewlite.test` | `Admin@12345` | Truy cập trang Admin (`/admin/users`, quản lý sản phẩm, đơn hàng, kho) |

> **Lưu ý:** Đây là tài khoản demo công khai chỉ dùng cho môi trường local/test. Không dùng mật khẩu này trên production. Nếu muốn đổi mật khẩu, hãy đăng nhập rồi đổi trong phần hồ sơ cá nhân.
