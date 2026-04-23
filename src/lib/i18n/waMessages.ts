import { Lang, Vibe } from "./types";
import { formatRupiah } from "@/lib/format";

export type WaCtx = {
  name: string;
  service: string; // "Netflix" / "Indomaret"
  amount: number;
  currency?: string;
  paymentBlock?: string;
};

// Per-language casual + pro WhatsApp templates.
// {name} {service} {amount} {pay}
const tpl: Record<Lang, { casual: string; pro: string }> = {
  id: {
    casual: "Yo {name}! Jangan lupa patunganmu buat {service} ya 🙏\nBagianmu: {amount}\n\n{pay}\n\nMakasih cuy! ✌️",
    pro: "Halo {name},\nMohon diingat pembayaran patungan untuk {service}.\nBagian Anda: {amount}\n\n{pay}\n\nTerima kasih.",
  },
  en: {
    casual: "Yo {name}, don't forget your share for {service}! It's {amount}. Thanks! 🙌\n\n{pay}",
    pro: "Hi {name},\nA gentle reminder for your share of {service}: {amount}.\n\n{pay}\n\nThank you.",
  },
  zh: {
    casual: "嘿 {name}！别忘了你 {service} 的份哦～{amount}，谢啦！🙏\n\n{pay}",
    pro: "您好 {name}：\n请记得支付 {service} 的分摊费用：{amount}\n\n{pay}\n\n谢谢。",
  },
  ja: {
    casual: "{name} ちゃん！{service} の割り勘忘れないでね～ {amount}！ありがと 🙏\n\n{pay}",
    pro: "{name} 様\n{service} の分担金 {amount} のお支払いをお願いいたします。\n\n{pay}\n\nよろしくお願いします。",
  },
  ko: {
    casual: "야 {name}! {service} 네 몫 잊지 마라~ {amount}이야! 땡큐 🙏\n\n{pay}",
    pro: "{name} 님,\n{service} 분담금 {amount} 결제 부탁드립니다.\n\n{pay}\n\n감사합니다.",
  },
  es: {
    casual: "Oye {name}, ¡no te olvides de tu parte de {service}! Son {amount}. ¡Gracias! 🙌\n\n{pay}",
    pro: "Hola {name}:\nUn recordatorio amable de tu parte de {service}: {amount}.\n\n{pay}\n\nGracias.",
  },
  fr: {
    casual: "Hé {name} ! N'oublie pas ta part pour {service}, c'est {amount}. Merci ! 🙌\n\n{pay}",
    pro: "Bonjour {name},\nUn rappel amical pour votre part de {service} : {amount}.\n\n{pay}\n\nMerci.",
  },
  de: {
    casual: "Hey {name}, denk an deinen Anteil für {service}! Sind {amount}. Danke! 🙌\n\n{pay}",
    pro: "Hallo {name},\neine freundliche Erinnerung an Ihren Anteil für {service}: {amount}.\n\n{pay}\n\nVielen Dank.",
  },
  pt: {
    casual: "E aí {name}, não esquece da tua parte do {service}! São {amount}. Valeu! 🙌\n\n{pay}",
    pro: "Olá {name},\nLembrete amigável da sua parte de {service}: {amount}.\n\n{pay}\n\nObrigado.",
  },
  it: {
    casual: "Ehi {name}, non dimenticare la tua parte per {service}! Sono {amount}. Grazie! 🙌\n\n{pay}",
    pro: "Ciao {name},\nun gentile promemoria della tua quota di {service}: {amount}.\n\n{pay}\n\nGrazie.",
  },
  nl: {
    casual: "Hé {name}, vergeet je deel voor {service} niet! Het is {amount}. Bedankt! 🙌\n\n{pay}",
    pro: "Hallo {name},\nEen vriendelijke herinnering voor uw deel van {service}: {amount}.\n\n{pay}\n\nDank u.",
  },
  ru: {
    casual: "Привет {name}! Не забудь скинуться на {service} – {amount}. Спасибо! 🙌\n\n{pay}",
    pro: "Здравствуйте, {name}!\nНапоминаю о вашей доле за {service}: {amount}.\n\n{pay}\n\nСпасибо.",
  },
  ar: {
    casual: "{name}! ما تنساش حصتك من {service} 🙏 {amount}\n\n{pay}\n\nشكراً!",
    pro: "مرحباً {name}،\nتذكير ودي بحصتك من {service}: {amount}\n\n{pay}\n\nشكراً لك.",
  },
  hi: {
    casual: "हे {name}! {service} का अपना हिस्सा मत भूलना 🙏 {amount}\n\n{pay}\n\nथैंक्स!",
    pro: "नमस्ते {name},\n{service} के लिए आपका हिस्सा: {amount}\n\n{pay}\n\nधन्यवाद।",
  },
  th: {
    casual: "เฮ้ {name}! อย่าลืมส่วนของแก {service} นะ 🙏 {amount}\n\n{pay}\n\nขอบคุณ!",
    pro: "สวัสดีคุณ {name}\nขอเตือนเรื่องค่า {service} ส่วนของคุณ: {amount}\n\n{pay}\n\nขอบคุณครับ/ค่ะ",
  },
  vi: {
    casual: "Ê {name}! Đừng quên phần {service} của mày nhé 🙏 {amount}\n\n{pay}\n\nCảm ơn!",
    pro: "Xin chào {name},\nNhắc nhở phần {service} của bạn: {amount}\n\n{pay}\n\nCảm ơn.",
  },
  tr: {
    casual: "Selam {name}! {service} payını unutma ha 🙏 {amount}\n\n{pay}\n\nSağol!",
    pro: "Merhaba {name},\n{service} payınız için kibar bir hatırlatma: {amount}\n\n{pay}\n\nTeşekkürler.",
  },
  pl: {
    casual: "Hej {name}! Pamiętaj o swojej części za {service} 🙏 {amount}\n\n{pay}\n\nDzięki!",
    pro: "Witaj {name},\nPrzypomnienie o Twojej części za {service}: {amount}\n\n{pay}\n\nDziękuję.",
  },
  sv: {
    casual: "Hej {name}! Glöm inte din del för {service} 🙏 {amount}\n\n{pay}\n\nTack!",
    pro: "Hej {name},\nEn vänlig påminnelse om din del av {service}: {amount}\n\n{pay}\n\nTack.",
  },
  ms: {
    casual: "Yo {name}! Jangan lupa share kau untuk {service} ye 🙏 {amount}\n\n{pay}\n\nThanks!",
    pro: "Salam {name},\nPeringatan mesra untuk bahagian anda bagi {service}: {amount}\n\n{pay}\n\nTerima kasih.",
  },
};

export const buildWaMessage = (lang: Lang, vibe: Vibe, ctx: WaCtx) => {
  const base = (tpl as any)[lang]?.[vibe] || tpl.en[vibe];
  return base
    .replace("{name}", ctx.name || "—")
    .replace("{service}", ctx.service)
    .replace("{amount}", formatRupiah(ctx.amount, ctx.currency || "IDR"))
    .replace("{pay}", ctx.paymentBlock || "");
};

export const openWa = (phone: string | undefined, msg: string) => {
  const clean = (phone || "").replace(/\D/g, "");
  const num = clean.startsWith("0") ? "62" + clean.slice(1) : clean;
  const url = num
    ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}`
    : `https://wa.me/?text=${encodeURIComponent(msg)}`;
  window.open(url, "_blank");
};