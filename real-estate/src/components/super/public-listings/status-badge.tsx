const COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  pending_review: "bg-yellow-100 text-yellow-700",
  rejected: "bg-red-100 text-red-700",
  draft: "bg-gray-100 text-gray-600",
  sold: "bg-blue-100 text-blue-700",
  rented: "bg-purple-100 text-purple-700",
  expired: "bg-gray-100 text-gray-500",
  archived: "bg-gray-200 text-gray-600",
};

const LABELS: Record<string, string> = {
  active: "Идэвхтэй",
  pending_review: "Хянуулж буй",
  rejected: "Татгалзсан",
  draft: "Ноорог",
  sold: "Зарагдсан",
  rented: "Түрээсэлсэн",
  expired: "Дууссан",
  archived: "Архивласан",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
        COLORS[status] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {LABELS[status] ?? status}
    </span>
  );
}
