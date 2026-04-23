export type Lang =
  | "id" | "en" | "zh" | "ja" | "ko" | "es" | "fr" | "de"
  | "pt" | "it" | "nl" | "ru" | "ar" | "hi" | "th" | "vi"
  | "tr" | "pl" | "sv" | "ms";

export type Vibe = "casual" | "pro";

export const LANGUAGES: { v: Lang; l: string; flag: string }[] = [
  { v: "id", l: "Bahasa Indonesia", flag: "🇮🇩" },
  { v: "en", l: "English", flag: "🇬🇧" },
  { v: "zh", l: "中文", flag: "🇨🇳" },
  { v: "ja", l: "日本語", flag: "🇯🇵" },
  { v: "ko", l: "한국어", flag: "🇰🇷" },
  { v: "es", l: "Español", flag: "🇪🇸" },
  { v: "fr", l: "Français", flag: "🇫🇷" },
  { v: "de", l: "Deutsch", flag: "🇩🇪" },
  { v: "pt", l: "Português", flag: "🇵🇹" },
  { v: "it", l: "Italiano", flag: "🇮🇹" },
  { v: "nl", l: "Nederlands", flag: "🇳🇱" },
  { v: "ru", l: "Русский", flag: "🇷🇺" },
  { v: "ar", l: "العربية", flag: "🇸🇦" },
  { v: "hi", l: "हिन्दी", flag: "🇮🇳" },
  { v: "th", l: "ไทย", flag: "🇹🇭" },
  { v: "vi", l: "Tiếng Việt", flag: "🇻🇳" },
  { v: "tr", l: "Türkçe", flag: "🇹🇷" },
  { v: "pl", l: "Polski", flag: "🇵🇱" },
  { v: "sv", l: "Svenska", flag: "🇸🇪" },
  { v: "ms", l: "Bahasa Melayu", flag: "🇲🇾" },
];

export type TranslationKey =
  | "greeting" | "today" | "budget_month" | "no_budget" | "from" | "spent"
  | "ok_msg" | "warn_msg" | "danger_msg"
  | "quick_actions" | "check_stock" | "recent_tx" | "see_all" | "no_tx"
  | "running_low" | "running_low_desc" | "items_running_low"
  | "settings" | "profile" | "language" | "vibe" | "vibe_casual" | "vibe_pro"
  | "currency" | "logout" | "logout_q" | "cancel" | "save" | "saved"
  | "subscriptions" | "sub_add" | "sub_name" | "sub_amount" | "sub_billing" | "sub_monthly" | "sub_yearly" | "sub_next_date"
  | "sub_shared" | "sub_share_with" | "sub_members" | "sub_per_person"
  | "tagih_via_wa" | "mark_paid" | "no_subs"
  | "notifications" | "no_notifications" | "remind_sub" | "remind_split"
  | "voice_input" | "voice_listening" | "voice_confirm" | "voice_amount" | "voice_merchant"
  | "new_tx" | "tx_merchant" | "tx_date" | "tx_amount" | "tx_category" | "tx_payment" | "tx_notes" | "tx_saving" | "tx_save"
  | "back" | "next" | "loading" | "error_generic";

export type Translations = Record<TranslationKey, string>;
export type VibePack = { casual: Translations; pro: Translations };
export type Pack = Record<Lang, VibePack>;