/**
 * Bổ sung dữ liệu mẫu vào DB đang có, không xoá đơn/người dùng.
 * Muốn reset sạch toàn bộ thì dùng `npm run prisma:seed`.
 *
 * Chạy trong thư mục `apps/api/`: npm run demo:patch
 */
import { Prisma, PrismaClient, ProductSize } from '@prisma/client';
import { additionalMenuItems } from './additional-menu-items';
import { ingredientSeeds } from './ingredients-data';
import { recipeQuantity, recipeTemplates } from './recipes-data';
import { sampleStockImport, sampleStockImportTotal } from './stock-import-data';

const prisma = new PrismaClient();
const SIZES: ProductSize[] = [ProductSize.S, ProductSize.M, ProductSize.L];
const TOPPINGS = [
  { name: 'Trân châu hoàng kim', price: 5000, stock: 200 },
  { name: 'Vải', price: 8000, stock: 150 },
  { name: 'Đác thơm', price: 8000, stock: 150 },
];

async function addIngredients() {
  let created = 0;
  let skipped = 0;

  for (const item of ingredientSeeds) {
    const nameKey = item.name.toLowerCase();
    const existing = await prisma.ingredient.findUnique({ where: { nameKey }, select: { id: true } });
    if (existing) {
      skipped += 1;
      continue;
    }

    await prisma.ingredient.create({
      data: { name: item.name, nameKey, unit: item.unit, stock: item.stock, price: item.price },
    });
    created += 1;
    console.log(`Đã thêm nguyên liệu: ${item.name}`);
  }

  console.log(`Nguyên liệu: ${created} mới, ${skipped} đã tồn tại.`);
}

async function addToppings() {
  for (const item of TOPPINGS) {
    const existing = await prisma.topping.findFirst({ where: { name: item.name }, select: { id: true } });
    if (!existing) {
      await prisma.topping.create({ data: item });
      console.log(`Đã thêm topping: ${item.name}`);
    }
  }
}

async function addMenuItems() {
  for (const { categorySlug, ...item } of additionalMenuItems) {
    const category = await prisma.category.findUnique({ where: { slug: categorySlug } });
    if (!category) throw new Error(`Chưa có danh mục ${categorySlug}. Hãy chạy prisma:seed trước.`);

    const exists = await prisma.product.findFirst({
      where: { categoryId: category.id, name: item.name },
      select: { id: true },
    });
    if (exists) continue;

    await prisma.product.create({
      data: {
        ...item,
        categoryId: category.id,
        sizePrices: {
          create: [
            { size: ProductSize.S, priceAdjustment: 0 },
            { size: ProductSize.M, priceAdjustment: 5000 },
            { size: ProductSize.L, priceAdjustment: 10000 },
          ],
        },
      },
    });
    console.log(`Đã thêm sản phẩm: ${item.name}`);
  }
}

async function addRecipes() {
  const [products, ingredients] = await Promise.all([
    prisma.product.findMany({ select: { id: true, name: true, sizePrices: { select: { size: true } } } }),
    prisma.ingredient.findMany({ select: { id: true, name: true } }),
  ]);
  const ingredientByName = new Map(ingredients.map((item) => [item.name, item]));
  let createdSizes = 0;
  let skippedSizes = 0;

  for (const template of recipeTemplates) {
    const product = products.find((item) => item.name === template.productName);
    if (!product) {
      console.warn(`Bỏ qua công thức: chưa có sản phẩm "${template.productName}"`);
      continue;
    }

    const missing = template.ingredients.filter((item) => !ingredientByName.has(item.ingredientName));
    if (missing.length) {
      throw new Error(
        `Thiếu nguyên liệu cho ${template.productName}: ${missing.map((item) => item.ingredientName).join(', ')}`,
      );
    }

    const availableSizes = new Set(product.sizePrices.map((item) => item.size));
    for (const size of SIZES.filter((item) => availableSizes.has(item))) {
      const existing = await prisma.recipeIngredient.count({ where: { productId: product.id, size } });
      if (existing > 0) {
        skippedSizes += 1;
        continue;
      }

      await prisma.recipeIngredient.createMany({
        data: template.ingredients.map((item) => ({
          productId: product.id,
          size,
          ingredientId: ingredientByName.get(item.ingredientName)!.id,
          quantity: recipeQuantity(item.quantity, size),
        })),
      });
      createdSizes += 1;
      console.log(`Đã tạo công thức: ${product.name} — size ${size}`);
    }
  }

  console.log(`Công thức: ${createdSizes} size mới, ${skippedSizes} đã có sẵn.`);
}

async function addStockImport() {
  const sample = sampleStockImport;
  const existing = await prisma.stockImport.findFirst({
    where: { supplier: sample.supplier, note: sample.note },
    select: { importNumber: true },
  });
  if (existing) {
    console.log(`Phiếu nhập mẫu đã tồn tại (#${existing.importNumber}), bỏ qua.`);
    return;
  }

  const ingredients = await prisma.ingredient.findMany({
    where: { name: { in: sample.items.map((item) => item.ingredientName) } },
    select: { id: true, name: true },
  });
  const byName = new Map(ingredients.map((item) => [item.name, item.id]));
  const missing = sample.items.filter((item) => !byName.has(item.ingredientName));
  if (missing.length) {
    throw new Error(`Thiếu nguyên liệu: ${missing.map((item) => item.ingredientName).join(', ')}`);
  }

  const created = await prisma.$transaction(async (tx) => {
    const importRow = await tx.stockImport.create({
      data: {
        supplier: sample.supplier,
        note: sample.note,
        totalAmount: new Prisma.Decimal(sampleStockImportTotal),
        createdBy: sample.createdBy,
        items: {
          create: sample.items.map((item) => ({
            ingredientId: byName.get(item.ingredientName)!,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: new Prisma.Decimal(item.quantity * item.unitPrice),
          })),
        },
      },
      select: { id: true, importNumber: true },
    });

    for (const item of sample.items) {
      await tx.ingredient.update({
        where: { id: byName.get(item.ingredientName)! },
        data: { stock: { increment: item.quantity }, price: item.unitPrice, version: { increment: 1 } },
      });
    }

    return importRow;
  });

  console.log(
    `Đã tạo phiếu nhập mẫu #${created.importNumber}: ${sample.items.length} nguyên liệu, tổng ${sampleStockImportTotal.toLocaleString('vi-VN')} đ.`,
  );
}

async function main() {
  await addIngredients();
  await addToppings();
  await addMenuItems();
  await addRecipes();
  await addStockImport();
  console.log('🎉 Hoàn tất bổ sung dữ liệu mẫu.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });