-- Tồn kho tính từ ingredients + recipes; 2 cột này không được API đọc/ghi.
ALTER TABLE "products" DROP COLUMN "stock";
ALTER TABLE "products" DROP COLUMN "version";