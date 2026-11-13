import { fetchApi } from "@/lib/api-client";
import type { ProductDetail, ProductSize, ProductSummary } from "@/types/product";

export type SizeAdjustment = { size: ProductSize; priceAdjustment: number };
export type CategorySummary = { id: string; name: string; slug: string };

export function getSizePrices(id: string) {
  return fetchApi<SizeAdjustment[]>(`/products/${encodeURIComponent(id)}/size-prices`, { cache: 'no-store' });
}

export function updateSizePrices(id: string, sizes: SizeAdjustment[]) {
  return fetchApi<SizeAdjustment[]>(`/products/${encodeURIComponent(id)}/size-prices`, { method: 'PUT', body: JSON.stringify({ sizes }) });
}

export function getProducts(): Promise<ProductSummary[]> {
  return fetchApi<ProductSummary[]>("/products");
}

export function getProductById(id: string): Promise<ProductDetail> {
  return fetchApi<ProductDetail>(`/products/${encodeURIComponent(id)}`);
}

export function getAllCategories(): Promise<CategorySummary[]> {
  return fetchApi<CategorySummary[]>("/categories");
}

export function createProduct(data: { name: string; categorySlug: string; basePrice: number; isAvailable?: boolean }) {
  return fetchApi(`/products`, { method: "POST", body: JSON.stringify(data) });
}

export function deleteProduct(id: string) {
  return fetchApi(`/products/${encodeURIComponent(id)}`, { method: "DELETE" });
}