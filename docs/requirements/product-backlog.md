# Product Backlog và Definition of Done – BrewLite

Tài liệu phục vụ **Task 4.1** (issue board/Product Backlog, quy ước commit, DoD). Ma trận truy vết
dùng lại mã `US-xx` ở đây.

## 1. Product Backlog

| Mã | User story | Ưu tiên | FR | Sprint |
|---|---|---|---|---|
| US-01 | Là khách, tôi xem được thực đơn kèm ảnh, giá và danh mục để chọn món. | Must | FR-01 | 1 |
| US-02 | Là khách, tôi tìm món bằng từ khoá có dấu hoặc không dấu và lọc theo danh mục. | Must | FR-01 | 1 |
| US-03 | Là khách, tôi mở chi tiết món, chọn size và topping và thấy giá cập nhật ngay. | Must | FR-02 | 2 |
| US-04 | Là khách, tôi thêm/sửa/xoá món trong giỏ và thấy tổng tiền tức thì. | Must | FR-03 | 2 |
| US-05 | Là khách, tôi đăng ký/đăng nhập và giữ phiên bằng JWT. | Must | FR-04 | 2 |
| US-06 | Là khách, tôi đặt đơn và hệ thống kiểm tra tồn kho, tính tiền ở server. | Must | FR-05, FR-09 | 2 |
| US-07 | Là khách, tôi thanh toán qua ZaloPay Sandbox và được chuyển về trang kết quả. | Must | FR-05, FR-08 | 2 |
| US-08 | Là khách, tôi xem lịch sử và chi tiết đơn, thấy trạng thái tự cập nhật. | Must | FR-06, FR-12 | 2 |
| US-09 | Là khách, tôi áp voucher và dùng điểm tích luỹ khi thanh toán. | Should | FR-10 | 2 |
| US-10 | Là quản lý, tôi chuyển trạng thái đơn theo đúng quy trình và huỷ đơn khi cần. | Must | FR-07, FR-11 | 2 |
| US-11 | Là quản lý, tôi quản lý sản phẩm, nguyên liệu, công thức và nhập kho. | Should | FR-11 | 2 |
| US-12 | Là quản lý, tôi đối soát giao dịch thanh toán và đồng bộ lại với ZaloPay. | Should | FR-11 | 2 |

### Sprint 1 – Nền tảng và MVP Menu (20/10 – 26/10/2026)

**Sprint Goal:** có monorepo chạy được, tài liệu Task 1–3 trong `docs/`, pipeline CI chặn merge và
luồng xem menu hoạt động trên dữ liệu seed.

| Hạng mục | Nội dung | Bằng chứng |
|---|---|---|
| Repository | `apps/web`, `apps/api`, `docs/`, `.env.example`, `.gitignore`, README | cấu trúc repo |
| Tài liệu | context-and-scope, SRS, use-case, activity/sequence/class, ADR, ma trận truy vết | `docs/` |
| API | `GET /products`, `GET /products/:id`, seed 8 sản phẩm | `apps/api/src/modules/products/` |
| Web | màn hình menu mobile-first, loading/empty/error, tìm kiếm + lọc | `apps/web/src/app/menu/` |
| Kiểm thử | unit test API sản phẩm + test lọc menu | `apps/api/test/products.test.cjs`, `apps/web/tests/menu-filter.test.mjs` |
| CI | install → lint → test → build trên PR, chặn merge khi lỗi | `.github/workflows/ci.yml` |

### Sprint 2 – End-to-end, CD và bàn giao (27/10 – 14/11/2026)

**Sprint Goal:** hoàn thành luồng menu → giỏ → đặt đơn → ZaloPay → theo dõi đơn, kiểm thử ba tầng,
triển khai production truy cập được.

| Hạng mục | Nội dung | Bằng chứng |
|---|---|---|
| Chi tiết & giỏ | size/topping, giỏ Zustand, giữ giỏ khi lỗi | `apps/web/src/app/products/[id]/`, `store/useCartStore.ts` |
| Xác thực | đăng ký/đăng nhập, JWT guard, role admin | `apps/api/src/modules/auth/` |
| Đơn & kho | tạo đơn trong transaction, state machine, hoàn kho | `apps/api/src/modules/orders/` |
| Thanh toán | ZaloPay Sandbox, idempotency, callback/sync | `apps/api/src/modules/payments/` |
| Quản trị | sản phẩm, kho, công thức, đơn, đối soát | `apps/web/src/app/admin/` |
| Kiểm thử | 49 backend + 10 frontend + E2E HTTP | `apps/api/test/`, `apps/web/tests/`, `tests/e2e/` |
| Triển khai | Vercel + Render + Neon, `/health`, docker compose | `docs/deployment.md` |
| Bàn giao | README, release notes, demo, retro | `README.md`, báo cáo mục 5.4 |

## 2. Definition of Done (DoD)

Một hạng mục chỉ được coi là **Done** khi:

1. Có issue/PR tương ứng, mô tả nêu phạm vi và cách kiểm chứng.
2. Code build được ở cả `apps/web` và `apps/api` (`npm run build`).
3. Có kiểm thử cho nghiệp vụ chính; test cũ vẫn xanh (`npm test`).
4. Lint sạch hoặc chỉ còn cảnh báo không chặn build.
5. Đã review bởi ít nhất một thành viên khác và merge qua PR vào `main`.
6. Không có secret, `console.log` tạm hay mã chết trong diff.
7. Tài liệu liên quan (`docs/`) được cập nhật nếu thay đổi yêu cầu, API hoặc sơ đồ.
8. CI trên PR xanh; nếu đỏ thì không merge.

## 3. Quy ước commit và nhánh

Xem [git-convention.md](../git-convention.md): nhánh `feat/<scope>`, `fix/<scope>`, `docs/<scope>`;
commit theo Conventional Commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:`), mỗi commit một ý.
