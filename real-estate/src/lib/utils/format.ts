// Currency болон тоо форматлах helper-үүд.
// Бүх хуудаст ижил харагдахын тулд эндээс import хийнэ.

const MNT_FORMATTER = new Intl.NumberFormat("mn-MN", {
  maximumFractionDigits: 0,
});

// "1 500 000" хэлбэрээр форматлана, ₮ тэмдэгтгүй (UI-аар тус тусдаа байрлуулна)
export function formatMNT(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  return MNT_FORMATTER.format(value);
}

// Богино хэлбэр: "2.5 тэрбум", "350 сая", "950 мян"
export function formatMNTShort(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return "—";
  if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1).replace(/\.0$/, "")} тэрбум`;
  if (value >= 1_000_000) return `${Math.round(value / 1_000_000)} сая`;
  if (value >= 1_000) return `${Math.round(value / 1_000)} мян`;
  return MNT_FORMATTER.format(value);
}

// Үнэ м²-аар: price/area-аас тооцох
export function pricePerSqm(price: number, area: number): string {
  if (!area || area <= 0 || !Number.isFinite(price)) return "—";
  const pp = price / area;
  if (pp >= 1_000_000) return `${(pp / 1_000_000).toFixed(1)} сая/м²`;
  if (pp >= 1_000) return `${Math.round(pp / 1_000)} мян/м²`;
  return `${Math.round(pp)} /м²`;
}
