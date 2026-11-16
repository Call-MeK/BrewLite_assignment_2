# Bản đồ nguồn cho báo cáo Assignment 2

Mỗi mục trong `docs/report/as2.tex` ← đọc file nào, lấy hình/bảng nào, ai viết.
**Quy tắc:** không sửa file `.tex` của người khác; label đặt prefix theo cột *Prefix*
(`figA:`, `tabB:`, `secC:`) để tránh trùng khi ghép.

Ký hiệu: ✅ có sẵn · 🟡 cần bổ sung/viết mới · 🔴 chưa có trong repo

---

## Người A — Chương 1 + Task 1 + Task 2

| Mục LaTeX | Nội dung | Nguồn đọc | Hình / bảng | Trạng thái | Prefix |
|---|---|---|---|---|---|
| `00-tong-quan` §1.1 | Bài toán, mục tiêu, phạm vi MVP, công nghệ | `requirements/context-and-scope.md` | — | ✅ | `secA:` |
| §1.2 | Luồng end-to-end một dòng + bảng thành phần hệ thống | `requirements/context-and-scope.md`, `README.md` | bảng thành phần | ✅ | `tabA:` |
| §1.3 | URL production, tài khoản demo, cách tái lập | `architecture/deployment.md` (đang ở `docs/deployment.md`) | bảng môi trường | ✅ | `tabA:` |
| `01-task1` §2.1 | Bối cảnh, 6 stakeholder + kỳ vọng, in/out-scope, giả định–ràng buộc–rủi ro | `requirements/context-and-scope.md` | bảng stakeholder, bảng rủi ro | ✅ | `tabA:` |
| §2.2 | SRS rút gọn: FR-01…12 + NFR-01…09, cột **MoSCoW** + AC | `requirements/srs.md` | 2 bảng | ✅ (đã thêm MoSCoW) | `tabA:` |
| §2.2 | Sơ đồ use-case tổng quát | `diagrams/usecase-overall.puml` | `figures/diagrams/BrewLite-UseCase-Overall.png` | ✅ | `figA:` |
| §2.3 | Đặc tả UC-01: actor, trigger, pre/post, luồng chính/thay thế/ngoại lệ, map FR | `requirements/use-case-uc01.md` | bảng luồng, use-case order | 🟡 UC hiện **chỉ có tạo đơn**, A phải bổ sung nhánh thanh toán (FR-05, FR-08) | `tabA:` |
| `02-task2` §3.1 | Activity end-to-end: swimlane, decision/merge, hết hàng, chưa login, payment fail | `diagrams/activity-*.puml`, `order/state-machine.md` | activity diagram + ảnh | 🟡 gộp 7 activity thành 1 end-to-end có swimlane | `figA:` |
| §3.2 | Sequence checkout: 5 lifeline, JWT, validate, transaction, alt payment, idempotency | `diagrams/sequence-checkout.puml` | `figures/diagrams/BrewLite-Checkout.png` + `diagrams/sequence-checkout.svg` | ✅ | `figA:` |
| §3.3 | Class diagram domain: User, Product, Order, OrderItem, Payment, Promotion, LoyaltyTransaction + enum + multiplicity | `database-design.md`, `apps/api/prisma/schema.prisma` | diagram draw.io | 🔴 A vẽ từ link draw.io | `figA:` |
| §3.4 | Bảng nhất quán 3 sơ đồ với SRS/use-case (tiêu chí nghiệm thu Task 2) | tự tổng hợp | bảng đối chiếu | 🟡 | `tabA:` |

**Việc riêng của A:** export 3 sơ đồ ra `.svg` (kèm `.puml`/nguồn draw.io) theo đúng yêu cầu đề;
bổ sung payment flow vào UC-01; viết bảng nhất quán.

---

## Người B — Task 3 + Task 4 + mục 9

| Mục LaTeX | Nội dung | Nguồn đọc | Hình / bảng | Trạng thái | Prefix |
|---|---|---|---|---|---|
| `03-task3` §4.1 | Kiến trúc phân lớp + C4 container: web, API, DB, payment; 9 module; migration; logging–health–config; trade-off | `architecture/adr/*.md`, `deployment.md`, `../README.md` | bảng 9 module, C4 (nếu có) | 🟡 cần viết `architecture/architecture.md` (1–2 trang) | `secB:` |
| §4.2 | ADR 001 monorepo, ADR 002 ZaloPay sandbox: bối cảnh, quyết định, hệ quả | `architecture/adr/` | 2 bảng ADR ngắn | ✅ | `tabB:` |
| §4.3 | Deployment diagram production: Vercel/Render/Neon/GitHub, HTTPS, cổng, secret, ranh giới local–CI–prod | `architecture/deployment-diagram.puml` | `figures/diagrams/BrewLite-Deployment.png` + `architecture/deployment-diagram.svg` | ✅ | `figB:` |
| `04-task4` §5.1 | Repo, branch, PR, commit convention, **DoD**, **Product Backlog 2 sprint** | `requirements/product-backlog.md`, `git-convention.md`, `.github/workflows/ci.yml` | bảng backlog, bảng DoD | ✅ (đã tạo product-backlog) | `tabB:` |
| §5.2 | Quản lý tài liệu có version, thay đổi qua PR | `docs/README.md`, lịch sử git | bảng cây `docs/` | ✅ | `tabB:` |
| §5.3 | MVP Sprint 1: `GET /products`, `/products/:id`, menu mobile-first, loading/empty/error, seed | `apps/api/src/modules/products/`, `apps/web/src/app/menu/`, `figures/as2/view/01-menu-mobile.png` | ảnh menu | ✅ | `figB:` |
| §5.4 | CI: install → lint → test → build, chặn merge; minh chứng pass + fail | `.github/workflows/ci.yml`, GitHub Actions | 2 ảnh CI | 🟡 cần chụp 1 run pass + 1 run fail | `figB:` |
| `09-repo-checklist` §9.1 | Cây repo đúng đề, bảng checklist 9.1 kèm trạng thái | cây thư mục thật | bảng | ✅ | `tabB:` |

**Việc riêng của B:** viết `docs/architecture/architecture.md`; chụp ảnh CI pass/fail; export
deployment `.svg`.

---

## Người C — Task 5 + mục 8 + kết luận

| Mục LaTeX | Nội dung | Nguồn đọc | Hình / bảng | Trạng thái | Prefix |
|---|---|---|---|---|---|
| `05-task5` §6.1 | 7 chức năng Sprint 2 + state machine + hoàn kho/điểm | `order/state-machine.md`, `srs.md` FR-02…07, `test-scenarios.md` | sơ đồ trạng thái | ✅ | `figC:` |
| §6.1 | Ảnh giao diện khách + admin, mobile + desktop | `figures/as2/view/*.png`, `figures/as2/14-16*.png` | 16 ảnh | ✅ | `figC:` |
| §6.2 | Test 3 tầng: 49 backend, 10 frontend, E2E HTTP; bảng kết quả; Docker Compose; migration/seed; `/health` | `apps/api/test/`, `apps/web/tests/`, `tests/e2e/`, `docker-compose.yml` | bảng test, bảng kết quả | ✅ (tái dùng từ `as2.tex` cũ) | `tabC:` |
| §6.2 | Đo hiệu năng production | `as2.tex` cũ mục 7 | bảng 5 lần đo, cold start | ✅ | `tabC:` |
| §6.3 | CD: quality gate → image tag → registry → deploy → migration → smoke test → rollback | `.github/workflows/ci.yml`, `deployment.md` | sơ đồ pipeline | 🟡 repo **chưa có `cd.yml`** — mô tả hiện trạng thật (CI + Git integration + redeploy tag trước) và ghi rõ phần chưa tự động | `figC:` |
| §6.4 | URL production, tài khoản demo, release notes, Sprint Review/Retro, video demo | `deployment.md`, GitHub Releases | bảng URL, release notes | 🟡 release notes/retro/video chưa có | `tabC:` |
| `08-truy-vet` §7 | FR → Use-case/US → Thiết kế/Sơ đồ → Code/API → Test, đúng mẫu đề | `traceability-matrix.md` | bảng lớn | 🟡 viết lại theo mẫu đề (thêm cột US, Diagram, Test ID) | `tabC:` |
| `10-ket-luan` §8 | Kết quả đạt được, hạn chế, hướng phát triển | `srs.md` mục 4 | — | ✅ | `secC:` |

**Việc riêng của C:** viết lại traceability matrix; chụp release/tag; quay video demo 3 phút;
viết release notes + retro.

---

## Hình dùng chung – đặt tên thống nhất

| Tên file đích | Nguồn | Người phụ trách |
|---|---|---|
| `docs/diagrams/usecase-overall.svg` | `usecase-overall.puml` | A |
| `docs/diagrams/activity-end-to-end.svg` | `activity-*.puml` (gộp) | A |
| `docs/diagrams/sequence-checkout.svg` | `sequence-checkout.puml` | A |
| `docs/diagrams/class-domain.svg` | draw.io | A |
| `docs/architecture/deployment-diagram.svg` | `deployment-diagram.puml` | B |
| `docs/report/figures/ci-pass.png`, `ci-fail.png` | GitHub Actions | B |

> Đề yêu cầu **lưu cả tệp nguồn và ảnh/PDF kết xuất**, ví dụ
> `docs/diagrams/sequence-checkout.puml` và `docs/diagrams/sequence-checkout.svg`.
