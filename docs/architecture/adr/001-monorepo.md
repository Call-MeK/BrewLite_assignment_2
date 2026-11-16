# ADR-001: Dùng monorepo cho frontend và backend

- **Trạng thái:** Đã chấp nhận
- **Ngày:** 2026-10-20
- **Người quyết định:** Nhóm BrewLite

## Bối cảnh

Nhóm 6 người cùng phát triển một ứng dụng gồm Next.js (frontend), NestJS (backend) và
Prisma/PostgreSQL. Cần chọn cách tổ chức mã nguồn sao cho:

- Thay đổi API và UI trong cùng một pull request vẫn review được.
- Tài liệu, Postman, Docker Compose và CI nằm cạnh mã nguồn.
- Sinh viên mới clone một lần là chạy được, không phải quản lý nhiều repository.

## Quyết định

Giữ **một repository** với hai thư mục ứng dụng độc lập:

```
BrewLite/
├── apps/
│   ├── api/      # NestJS + Prisma
│   └── web/      # Next.js App Router
├── tests/        # end-to-end
├── docs/         # đặc tả, ADR, kịch bản kiểm thử
├── postman/      # smoke test collection
└── docker-compose.yml
```

Mỗi thư mục ứng dụng có `package.json`, `node_modules`, Dockerfile và pipeline build riêng. Không
dùng workspace tool (Turborepo/Nx) để giữ cấu hình đơn giản.

## Hệ quả

**Tích cực**

- Một PR có thể cập nhật đồng thời API contract, backend, frontend và test.
- CI chỉ cần checkout một lần; cache `node_modules` theo từng thư mục.
- Dễ đồng bộ phiên bản tài liệu với mã nguồn.

**Tiêu cực**

- CI phải chạy hai bộ cài đặt/build; thời gian lâu hơn một app.
- Dễ commit nhầm thay đổi giữa hai app nếu không tách nhánh rõ ràng.
- Chưa có ràng buộc kiểu dùng chung; contract API phải đồng bộ thủ công.

## Phương án đã cân nhắc

1. **Hai repository riêng:** tách quyền truy cập tốt hơn nhưng khó review thay đổi xuyên suốt
   và tăng công sức đồng bộ tài liệu. Bị loại vì quy mô nhóm nhỏ.
2. **Monorepo có Nx/Turborepo:** tăng tốc build và chia sẻ package, nhưng thêm độ phức tạp
   cấu hình không cần thiết ở học kỳ này.

## Ghi chú

Cấu trúc `apps/web` + `apps/api` + `docs/` + `tests/` được chốt theo yêu cầu
Assignment 2 (§9 Cấu trúc repository); `packages/shared` vẫn để ngỏ cho tới khi
thực sự cần chia sẻ type.
