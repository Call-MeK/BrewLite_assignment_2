# Đọc tài liệu BrewLite – Assignment 2

BrewLite là app đặt cà phê: **Next.js** (frontend) + **NestJS** (backend) + **PostgreSQL**,
thanh toán **ZaloPay Sandbox**. Tài liệu đã được gọn lại theo đúng 5 task của đề Assignment 2.

Muốn chạy thử dự án: xem [README gốc](../README.md).

---

## 1. Đọc gì trước (10 phút)

| Thứ tự | File | Nội dung |
|---|---|---|
| 1 | [requirements/context-and-scope.md](requirements/context-and-scope.md) | Bối cảnh, 6 stakeholder, in/out-scope, giả định, ràng buộc, rủi ro |
| 2 | [requirements/srs.md](requirements/srs.md) | FR-01…12, NFR-01…09, MoSCoW, tiêu chí chấp nhận |
| 3 | [requirements/use-case-uc01.md](requirements/use-case-uc01.md) | Đặc tả use-case trọng tâm: đặt và thanh toán đơn |
| 4 | [traceability-matrix.md](traceability-matrix.md) | FR → use-case → sơ đồ → code → test |

---

## 2. Theo task của đề

| Task | Tài liệu |
|---|---|
| 1 – Yêu cầu | [requirements/](requirements/): context-and-scope, srs, use-case-uc01, product-backlog |
| 2 – Mô hình hóa | [diagrams/](diagrams/): use-case, activity, sequence, class, state machine (`order/state-machine.md`) |
| 3 – Kiến trúc | [architecture/](architecture/): 2 ADR + deployment diagram; [database-design.md](database-design.md) |
| 4 – Sprint 1 | [requirements/product-backlog.md](requirements/product-backlog.md), [git-convention.md](git-convention.md), `.github/workflows/ci.yml` |
| 5 – Sprint 2 & CD | [deployment.md](deployment.md), [test-scenarios/test-scenarios.md](test-scenarios/test-scenarios.md) |
| Truy vết | [traceability-matrix.md](traceability-matrix.md) |

---

## 3. Chia việc viết báo cáo (3 người)

Chi tiết từng mục, nguồn đọc và hình cần lấy: **[REPORT-SOURCE-MAP.md](REPORT-SOURCE-MAP.md)**.

| Người | Phần | File LaTeX |
|---|---|---|
| **A** | Ch.1 Tổng quan + Task 1 + Task 2 | `report/sections/00`, `01`, `02` |
| **B** | Task 3 + Task 4 + mục 9 | `report/sections/03`, `04`, `09` |
| **C** | Task 5 + mục 8 truy vết + kết luận | `report/sections/05`, `08`, `10` |

Build báo cáo: `cd docs/report` rồi `latexmk -pdf as2.tex`.

---

## 4. Ba quy tắc quan trọng nhất

1. **Tiền và tồn kho chỉ tính ở backend**, trong transaction; client không gửi `userId`, `finalAmount`.
2. **Thanh toán idempotent**: bắt buộc `Idempotency-Key`, callback lặp không tạo giao dịch/điểm trùng.
3. **Không commit secret**: chỉ commit `.env.example`; giá trị thật để trong `.env` / `apps/api/.env`.

---

## 5. Tài liệu lưu trữ

Các đặc tả chi tiết theo từng chức năng (`auth/`, `cart/`, `payment/`…), quy ước đặt tên, checklist
review và báo cáo Assignment 1 đã được chuyển vào [`_archive/`](_archive/). Chỉ mở khi cần tra cứu
sâu; không dùng làm nguồn chính cho báo cáo Assignment 2.
