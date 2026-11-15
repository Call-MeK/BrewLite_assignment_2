# Báo cáo BrewLite — Assignment 1

Báo cáo tiếng Việt dựa trên `BrewLite-CongNghePhanMem.pdf`, dùng bố cục và logo từ template SGU được cung cấp. Không áp dụng rubric Assignment 2.

## Nội dung

- `Assignment_report.tex`: bìa, mục lục và điểm vào để biên dịch.
- `sections/user-stories.tex`: phạm vi, yêu cầu, User Story và backlog 10 task.
- `sections/use-cases.tex`: sơ đồ và đặc tả Use Case.
- `sections/architecture.tex`: kiến trúc, dữ liệu, luồng xử lý và Docker local.
- `sections/verification.tex`: bằng chứng kiểm chứng, kịch bản demo và checklist bàn giao.
- `assets/`: hai logo giữ nguyên từ mẫu SGU.

## Biên dịch

Chạy trong thư mục `docs/assignment1` bằng TeX Live/MiKTeX có gói tiếng Việt `vntex` và TikZ:

```powershell
pdflatex -interaction=nonstopmode -halt-on-error Assignment_report.tex
pdflatex -interaction=nonstopmode -halt-on-error Assignment_report.tex
```

Hoặc tải cả thư mục lên Overleaf, chọn main document `Assignment_report.tex`, compiler **pdfLaTeX**. Sơ đồ viết bằng TikZ, không cần PlantUML, shell escape hay dịch vụ render bên ngoài.

## Thông tin cần bổ sung

Sửa `GroupName`, `LecturerName`, `ClassName` và bảng thành viên trong file chính. Người dùng chưa cung cấp thông tin này nên báo cáo để “Chưa cung cấp”. Kế hoạch Sprint là đề xuất; không phải biên bản Scrum đã hoàn thành. Các tiêu chí kiểm thử cần có kết quả thực tế trước khi đánh dấu đạt.
