// Info pembayaran disimpan di localStorage saja (tidak ke server) — sesuai blueprint Sesi 6.

export type PaymentInfo = {
  bank: string;
  accountNumber: string;
  accountName: string;
};

const KEY = "spa_payment_info";

export const getPaymentInfo = (): PaymentInfo | null => {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as PaymentInfo;
    if (!p.bank || !p.accountNumber || !p.accountName) return null;
    return p;
  } catch {
    return null;
  }
};

export const setPaymentInfo = (p: PaymentInfo) => {
  localStorage.setItem(KEY, JSON.stringify(p));
};

export const formatPaymentBlock = (p: PaymentInfo) =>
  `${p.bank}\n${p.accountNumber}\na.n. ${p.accountName}`;
