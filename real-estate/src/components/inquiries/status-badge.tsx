const STATUS_STYLES: Record<string, string> = {
  new:                "bg-blue-50 text-blue-700",
  contacted:          "bg-yellow-50 text-yellow-700",
  viewing_scheduled:  "bg-purple-50 text-purple-700",
  negotiating:        "bg-orange-50 text-orange-700",
  closed_won:         "bg-green-50 text-green-700",
  closed_lost:        "bg-gray-100 text-gray-500",
};

const STATUS_LABELS: Record<string, string> = {
  new:                "Шинэ",
  contacted:          "Холбоо барьсан",
  viewing_scheduled:  "Үзэлт товлосон",
  negotiating:        "Хэлэлцэж байна",
  closed_won:         "Амжилттай",
  closed_lost:        "Хаагдсан",
};

export function InquiryStatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${STATUS_STYLES[status] ?? "bg-gray-100 text-gray-500"}`}>
      {STATUS_LABELS[status] ?? status}
    </span>
  );
}
