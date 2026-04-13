export const DISTRICTS = [
  "БЗД", "БГД", "СБД", "ЧД", "ХУД", "СХД",
  "НД", "ХХД", "БХД", "ЗХД", "НХД", "БНД",
  "ГЧД", "ДЗД", "ЭМД", "ЗД", "ЦС", "БС",
];

export const PROPERTY_TYPES = [
  { value: "apartment", label: "Орон сууц" },
  { value: "house",     label: "Байшин" },
  { value: "land",      label: "Газар" },
  { value: "commercial",label: "Арилжааны" },
  { value: "office",    label: "Оффис" },
];

export const PROPERTY_TYPE_LABELS: Record<string, string> = {
  apartment:  "Орон сууц",
  house:      "Байшин",
  land:       "Газар",
  commercial: "Арилжааны",
  office:     "Оффис",
};

export const LISTING_TYPE_LABELS: Record<string, string> = {
  sale: "Зарах",
  rent: "Түрээслэх",
};

export const STATUS_LABELS: Record<string, string> = {
  draft:          "Ноорог",
  pending_review: "Хянагдаж байна",
  active:         "Идэвхтэй",
  sold:           "Зарагдсан",
  rented:         "Түрээслэгдсэн",
  expired:        "Хугацаа дууссан",
  archived:       "Архивлагдсан",
};

export const STATUS_COLORS: Record<string, string> = {
  draft:          "bg-gray-100 text-gray-600",
  pending_review: "bg-yellow-50 text-yellow-700",
  active:         "bg-green-50 text-green-700",
  sold:           "bg-blue-50 text-blue-700",
  rented:         "bg-blue-50 text-blue-700",
  expired:        "bg-red-50 text-red-600",
  archived:       "bg-red-50 text-red-600",
};
