export const formatRupiah = (n: number, currency = "IDR") => {
  if (currency === "IDR") return `Rp ${Math.round(n).toLocaleString("id-ID")}`;
  return `${currency} ${Math.round(n).toLocaleString("en-US")}`;
};

export const getInitials = (name?: string | null) => {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  return (parts[0]?.[0] || "") + (parts[1]?.[0] || "");
};

export const CATEGORIES = [
  { v: "makan", l: "Makan & Minum", e: "🍚", color: "bg-warning-soft text-warning" },
  { v: "kopi_survival", l: "Kopi Survival", e: "☕", color: "bg-warning-soft text-warning" },
  { v: "kopi_lifestyle", l: "Kopi Lifestyle", e: "🧋", color: "bg-accent text-accent-foreground" },
  { v: "transport", l: "Transportasi", e: "🚗", color: "bg-primary-soft text-primary" },
  { v: "kuliah", l: "Keperluan Kuliah", e: "📚", color: "bg-primary-soft text-primary" },
  { v: "kos", l: "Kos & Utilitas", e: "🏠", color: "bg-success-soft text-success" },
  { v: "belanja", l: "Belanja", e: "👗", color: "bg-accent text-accent-foreground" },
  { v: "kesehatan", l: "Kesehatan", e: "💊", color: "bg-danger-soft text-danger" },
  { v: "hiburan", l: "Hiburan", e: "🎮", color: "bg-accent text-accent-foreground" },
  { v: "stok", l: "Stok Barang Rutin", e: "📦", color: "bg-success-soft text-success" },
  { v: "lainnya", l: "Lainnya", e: "💸", color: "bg-muted text-muted-foreground" },
] as const;

export const getCategory = (v?: string | null) =>
  CATEGORIES.find((c) => c.v === v) || CATEGORIES[CATEGORIES.length - 1];

export const PAYMENT_METHODS = ["Tunai", "GoPay", "OVO", "DANA", "Transfer", "Kartu"] as const;
