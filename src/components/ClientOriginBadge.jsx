import { useClientOrigins } from "@/lib/useClientOrigins";

export function ClientOriginBadge({ origin }) {
  const origins = useClientOrigins();
  const found = origins.find((o) => o.label === origin);
  const color = found?.color || "#94A3B8";

  return (
    <span
      className="inline-flex items-center text-xs px-2 py-0.5 rounded-full border font-medium whitespace-nowrap"
      style={{
        background: color + "20",
        color,
        borderColor: color + "60",
      }}
    >
      {origin || "—"}
    </span>
  );
}
