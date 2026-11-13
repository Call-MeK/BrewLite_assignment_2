import type { ProductSummary } from '../types/product';

/**
 * Chuẩn hoá chuỗi để tìm kiếm: bỏ dấu tiếng Việt, không phân biệt hoa/thường
 * và gộp các khoảng trắng thừa. Ví dụ: "  Cà Phê  " → "ca phe".
 */
export function removeVietnameseTones(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/đ/g, 'd')
    .trim()
    .replace(/\s+/g, ' ');
}

export function filterMenu(products: ProductSummary[], keyword: string, category: string) {
  const search = removeVietnameseTones(keyword);
  return products.filter(
    (product) =>
      (!category || product.categoryName === category) &&
      removeVietnameseTones(product.name).includes(search),
  );
}
