const vnd = new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' });

export const money = (value: number) => vnd.format(value);
