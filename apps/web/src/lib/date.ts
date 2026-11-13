/** Hiển thị ngày giờ kiểu Việt Nam: "14 thg 11, 2026 09:30". */
export const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));