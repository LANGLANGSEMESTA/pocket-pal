import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Copy, Minus, Plus, Send, Trash2, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { BottomNav } from "@/components/BottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatRupiah } from "@/lib/format";
import { relativeDateID } from "@/lib/date";
import { getPaymentInfo, setPaymentInfo, formatPaymentBlock, PaymentInfo } from "@/lib/payment";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// ----- Types -----
type RecentTx = {
  id: string;
  merchant_name: string | null;
  total_amount: number;
  transaction_date: string;
  is_itemized: boolean | null;
};
type Item = { item_name: string; price: number };
type Person = { name: string; phone: string };
type Mode = "rata" | "item";

type ActiveSplit = {
  id: string;
  member_name: string;
  member_phone: string | null;
  amount_owed: number;
  is_settled: boolean | null;
  transaction_id: string;
  transactions: { merchant_name: string | null; transaction_date: string } | null;
};

const SplitBill = () => {
  const navigate = useNavigate();
  const { user } = useAuth();

  // ---- Wizard state ----
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [sourceMode, setSourceMode] = useState<"recent" | "manual" | null>(null);
  const [selectedTx, setSelectedTx] = useState<RecentTx | null>(null);
  const [manualMerchant, setManualMerchant] = useState("");
  const [manualAmount, setManualAmount] = useState<string>("");
  const [items, setItems] = useState<Item[]>([]);
  const [recents, setRecents] = useState<RecentTx[]>([]);
  const [splitMode, setSplitMode] = useState<Mode | null>(null);
  const [people, setPeople] = useState<Person[]>([
    { name: "", phone: "" },
    { name: "", phone: "" },
  ]);
  // For "per item": map itemIndex -> set of personIndex
  const [itemAssign, setItemAssign] = useState<Record<number, Set<number>>>({});

  // Payment info modal
  const [askPay, setAskPay] = useState(false);
  const [payDraft, setPayDraft] = useState<PaymentInfo>({ bank: "", accountNumber: "", accountName: "" });
  const [pendingGenerate, setPendingGenerate] = useState(false);

  // Active tab data
  const [active, setActive] = useState<ActiveSplit[]>([]);
  const [loadingActive, setLoadingActive] = useState(true);

  // ---- Load recents + items when needed ----
  useEffect(() => {
    if (!user) return;
    supabase
      .from("transactions")
      .select("id,merchant_name,total_amount,transaction_date,is_itemized")
      .eq("user_id", user.id)
      .order("transaction_date", { ascending: false })
      .limit(10)
      .then(({ data }) => setRecents((data || []) as RecentTx[]));
  }, [user]);

  useEffect(() => {
    const loadItems = async () => {
      if (selectedTx?.is_itemized) {
        const { data } = await supabase
          .from("transaction_items")
          .select("item_name,price")
          .eq("transaction_id", selectedTx.id);
        setItems((data || []).map((d) => ({ item_name: d.item_name, price: Number(d.price) })));
      } else {
        setItems([]);
      }
    };
    loadItems();
  }, [selectedTx]);

  // ---- Load active settlements ----
  const loadActive = async () => {
    if (!user) return;
    setLoadingActive(true);
    const { data } = await supabase
      .from("split_settlements")
      .select("id,member_name,member_phone,amount_owed,is_settled,transaction_id,transactions(merchant_name,transaction_date)")
      .eq("created_by", user.id)
      .eq("is_settled", false)
      .order("created_at", { ascending: false });
    setActive((data || []) as unknown as ActiveSplit[]);
    setLoadingActive(false);
  };
  useEffect(() => {
    loadActive();
  }, [user]);

  // ---- Derived totals ----
  const totalAmount = useMemo(() => {
    if (selectedTx) return Number(selectedTx.total_amount);
    if (sourceMode === "manual") return Number(manualAmount) || 0;
    return 0;
  }, [selectedTx, sourceMode, manualAmount]);

  const merchantName = selectedTx?.merchant_name || manualMerchant || "Transaksi";

  const perPersonAmounts = useMemo(() => {
    if (splitMode === "rata") {
      const each = people.length ? totalAmount / people.length : 0;
      return people.map(() => each);
    }
    if (splitMode === "item") {
      return people.map((_, pi) => {
        let sum = 0;
        items.forEach((it, ii) => {
          const set = itemAssign[ii];
          if (set && set.size > 0 && set.has(pi)) sum += it.price / set.size;
        });
        return sum;
      });
    }
    return [];
  }, [splitMode, people, totalAmount, items, itemAssign]);

  // ---- Handlers ----
  const addPerson = () => people.length < 20 && setPeople([...people, { name: "", phone: "" }]);
  const removePerson = (i: number) => people.length > 2 && setPeople(people.filter((_, idx) => idx !== i));
  const updatePerson = (i: number, p: Partial<Person>) =>
    setPeople(people.map((x, idx) => (idx === i ? { ...x, ...p } : x)));

  const toggleItemAssign = (ii: number, pi: number) => {
    setItemAssign((prev) => {
      const set = new Set(prev[ii] || []);
      set.has(pi) ? set.delete(pi) : set.add(pi);
      return { ...prev, [ii]: set };
    });
  };

  const addManualItem = () => setItems([...items, { item_name: "", price: 0 }]);

  const canGoStep3 = !!splitMode;
  const canGenerate =
    splitMode === "rata"
      ? people.every((p) => p.name.trim()) && totalAmount > 0
      : splitMode === "item"
      ? people.every((p) => p.name.trim()) && items.length > 0 && items.every((i) => i.item_name && i.price > 0)
      : false;

  const handleGenerate = async () => {
    const pay = getPaymentInfo();
    if (!pay) {
      setAskPay(true);
      setPendingGenerate(true);
      return;
    }
    await doGenerate(pay);
  };

  const doGenerate = async (pay: PaymentInfo) => {
    if (!user) return;
    let txId = selectedTx?.id || null;

    // If manual source — create a lightweight transaction record
    if (!txId) {
      const { data, error } = await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          merchant_name: manualMerchant || "Split Bill",
          total_amount: totalAmount,
          transaction_date: new Date().toISOString().slice(0, 10),
          notes: "Dibuat dari Split Bill",
        })
        .select("id")
        .single();
      if (error || !data) {
        toast.error("Gagal membuat transaksi untuk split");
        return;
      }
      txId = data.id;
    }

    // Insert settlements
    const rows = people.map((p, idx) => ({
      transaction_id: txId!,
      created_by: user.id,
      member_name: p.name,
      member_phone: p.phone || null,
      amount_owed: Math.round(perPersonAmounts[idx]),
    }));
    const { error } = await supabase.from("split_settlements").insert(rows);
    if (error) {
      toast.error("Gagal menyimpan tagihan split");
      return;
    }
    toast.success("Tagihan dibuat! Kirim ke teman-temanmu ya 🎉");
    loadActive();
    setStep(4);
  };

  const buildMessage = (name: string, amount: number) => {
    const pay = getPaymentInfo();
    const payBlock = pay ? formatPaymentBlock(pay) : "[isi info pembayaran di Pengaturan]";
    return `Hei ${name}! Tagihan ${merchantName} tadi:\n\nBagianmu: ${formatRupiah(amount)}\n\nTransfer ke:\n${payBlock}\n\nKonfirmasi ke aku kalau udah ya! ✓`;
  };

  const sendWA = (phone: string | undefined, msg: string) => {
    const clean = (phone || "").replace(/\D/g, "");
    const num = clean.startsWith("0") ? "62" + clean.slice(1) : clean;
    const url = num ? `https://wa.me/${num}?text=${encodeURIComponent(msg)}` : `https://wa.me/?text=${encodeURIComponent(msg)}`;
    window.open(url, "_blank");
  };

  const copyMsg = async (msg: string) => {
    await navigator.clipboard.writeText(msg);
    toast.success("Pesan disalin");
  };

  const markSettled = async (id: string) => {
    const { error } = await supabase
      .from("split_settlements")
      .update({ is_settled: true, settled_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error("Gagal update");
    setActive((p) => p.filter((x) => x.id !== id));
    toast.success("Ditandai lunas ✓");
  };

  const resetWizard = () => {
    setStep(1);
    setSourceMode(null);
    setSelectedTx(null);
    setManualMerchant("");
    setManualAmount("");
    setItems([]);
    setSplitMode(null);
    setPeople([{ name: "", phone: "" }, { name: "", phone: "" }]);
    setItemAssign({});
  };

  return (
    <div className="app-shell pb-28">
      <header className="sticky top-0 z-20 bg-background/95 backdrop-blur border-b border-border px-4 pt-5 pb-3 flex items-center gap-2">
        <button onClick={() => navigate("/dashboard")} className="-ml-2 p-2">
          <ArrowLeft className="h-5 w-5" />
        </button>
        <h1 className="text-xl font-bold">Split Bill</h1>
      </header>

      <Tabs defaultValue="buat" className="px-4 py-4">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="buat">Buat Split</TabsTrigger>
          <TabsTrigger value="aktif">Tagihan Aktif</TabsTrigger>
        </TabsList>

        {/* ============== TAB BUAT SPLIT ============== */}
        <TabsContent value="buat" className="mt-4 space-y-4">
          {/* Stepper */}
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4].map((s) => (
              <div
                key={s}
                className={cn("flex-1 h-1.5 rounded-full", s <= step ? "bg-primary" : "bg-muted")}
              />
            ))}
          </div>

          {step === 1 && (
            <div className="space-y-3">
              <h2 className="font-semibold">Pilih sumber transaksi</h2>
              <Card
                className={cn("cursor-pointer transition-colors", sourceMode === "recent" && "ring-2 ring-primary")}
                onClick={() => setSourceMode("recent")}
              >
                <CardContent className="p-4">
                  <div className="font-semibold">Dari transaksi terbaru</div>
                  <div className="text-xs text-muted-foreground">Pilih dari 10 transaksi terakhir</div>
                </CardContent>
              </Card>
              <Card
                className={cn("cursor-pointer transition-colors", sourceMode === "manual" && "ring-2 ring-primary")}
                onClick={() => setSourceMode("manual")}
              >
                <CardContent className="p-4">
                  <div className="font-semibold">Input manual</div>
                  <div className="text-xs text-muted-foreground">Ketik nama merchant + total</div>
                </CardContent>
              </Card>

              {sourceMode === "recent" && (
                <div className="space-y-2 mt-2">
                  {recents.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Belum ada transaksi.</p>
                  )}
                  {recents.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setSelectedTx(t)}
                      className={cn(
                        "w-full text-left p-3 rounded-xl border bg-card flex justify-between items-center",
                        selectedTx?.id === t.id ? "border-primary ring-2 ring-primary/30" : "border-border"
                      )}
                    >
                      <div>
                        <div className="font-medium">{t.merchant_name || "Tanpa nama"}</div>
                        <div className="text-xs text-muted-foreground">{relativeDateID(t.transaction_date)}</div>
                      </div>
                      <div className="font-semibold">{formatRupiah(Number(t.total_amount))}</div>
                    </button>
                  ))}
                </div>
              )}

              {sourceMode === "manual" && (
                <div className="space-y-3 mt-2">
                  <div>
                    <Label>Nama merchant</Label>
                    <Input value={manualMerchant} onChange={(e) => setManualMerchant(e.target.value)} placeholder="Contoh: Warkop Bahagia" />
                  </div>
                  <div>
                    <Label>Total tagihan</Label>
                    <Input
                      inputMode="numeric"
                      value={manualAmount}
                      onChange={(e) => setManualAmount(e.target.value.replace(/\D/g, ""))}
                      placeholder="0"
                    />
                    {manualAmount && <p className="text-xs text-muted-foreground mt-1">{formatRupiah(Number(manualAmount))}</p>}
                  </div>
                </div>
              )}

              <Button
                className="w-full"
                disabled={!(selectedTx || (sourceMode === "manual" && manualMerchant && Number(manualAmount) > 0))}
                onClick={() => setStep(2)}
              >
                Lanjut
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h2 className="font-semibold">Pilih cara split</h2>
              <Card
                className={cn("cursor-pointer", splitMode === "rata" && "ring-2 ring-primary")}
                onClick={() => setSplitMode("rata")}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="text-3xl">÷</div>
                  <div>
                    <div className="font-semibold">Split Rata</div>
                    <div className="text-xs text-muted-foreground">Bagi sama rata semua orang</div>
                  </div>
                </CardContent>
              </Card>
              <Card
                className={cn(
                  "cursor-pointer",
                  splitMode === "item" && "ring-2 ring-primary",
                  selectedTx && !selectedTx.is_itemized && sourceMode !== "manual" && "opacity-60"
                )}
                onClick={() => setSplitMode("item")}
              >
                <CardContent className="p-4 flex items-center gap-3">
                  <div className="text-3xl">📋</div>
                  <div>
                    <div className="font-semibold">Split Per Item</div>
                    <div className="text-xs text-muted-foreground">Bagi sesuai item yang dipesan</div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>Kembali</Button>
                <Button className="flex-1" disabled={!canGoStep3} onClick={() => setStep(3)}>Lanjut</Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{merchantName}</span> · Total {formatRupiah(totalAmount || items.reduce((a, b) => a + b.price, 0))}
              </div>

              {/* People */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Anggota ({people.length})</Label>
                  <div className="flex gap-1">
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={() => removePerson(people.length - 1)} disabled={people.length <= 2}>
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="outline" className="h-8 w-8" onClick={addPerson} disabled={people.length >= 20}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {people.map((p, i) => (
                    <div key={i} className="grid grid-cols-2 gap-2">
                      <Input placeholder={`Nama orang ${i + 1}`} value={p.name} onChange={(e) => updatePerson(i, { name: e.target.value })} />
                      <Input placeholder="No. HP (opsional)" inputMode="tel" value={p.phone} onChange={(e) => updatePerson(i, { phone: e.target.value })} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Mode-specific UI */}
              {splitMode === "rata" && (
                <Card className="bg-primary-soft border-primary/20">
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-muted-foreground">Masing-masing bayar</div>
                    <div className="text-2xl font-bold text-primary mt-1">
                      {formatRupiah(perPersonAmounts[0] || 0)}
                    </div>
                  </CardContent>
                </Card>
              )}

              {splitMode === "item" && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Item</Label>
                    {!selectedTx?.is_itemized && (
                      <Button size="sm" variant="outline" onClick={addManualItem}>
                        <Plus className="h-3 w-3 mr-1" /> Tambah item
                      </Button>
                    )}
                  </div>
                  {items.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-3">Belum ada item.</p>
                  )}
                  {items.map((it, ii) => (
                    <Card key={ii}>
                      <CardContent className="p-3 space-y-2">
                        <div className="grid grid-cols-[1fr_auto_auto] gap-2 items-center">
                          <Input
                            placeholder="Nama item"
                            value={it.item_name}
                            onChange={(e) => setItems(items.map((x, k) => k === ii ? { ...x, item_name: e.target.value } : x))}
                            disabled={!!selectedTx?.is_itemized}
                          />
                          <Input
                            className="w-24"
                            inputMode="numeric"
                            placeholder="Harga"
                            value={it.price || ""}
                            onChange={(e) => setItems(items.map((x, k) => k === ii ? { ...x, price: Number(e.target.value.replace(/\D/g, "")) } : x))}
                            disabled={!!selectedTx?.is_itemized}
                          />
                          {!selectedTx?.is_itemized && (
                            <Button size="icon" variant="ghost" className="h-9 w-9 text-danger" onClick={() => setItems(items.filter((_, k) => k !== ii))}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 pt-1">
                          {people.map((p, pi) => (
                            <label key={pi} className="flex items-center gap-1.5 text-xs bg-muted px-2 py-1 rounded-md cursor-pointer">
                              <Checkbox
                                checked={!!itemAssign[ii]?.has(pi)}
                                onCheckedChange={() => toggleItemAssign(ii, pi)}
                              />
                              {p.name || `Orang ${pi + 1}`}
                            </label>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  <div className="space-y-1.5 pt-2">
                    <Label>Tagihan per orang</Label>
                    {people.map((p, pi) => (
                      <div key={pi} className="flex justify-between text-sm bg-card border border-border rounded-lg px-3 py-2">
                        <span>{p.name || `Orang ${pi + 1}`}</span>
                        <span className="font-semibold">{formatRupiah(perPersonAmounts[pi] || 0)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button variant="outline" className="flex-1" onClick={() => setStep(2)}>Kembali</Button>
                <Button className="flex-1" disabled={!canGenerate} onClick={handleGenerate}>
                  Generate Tagihan
                </Button>
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <div className="text-center py-2">
                <div className="text-4xl mb-2">📨</div>
                <h2 className="font-semibold">Kirim ke setiap orang</h2>
                <p className="text-xs text-muted-foreground">Pilih kirim WA atau salin pesan</p>
              </div>
              {people.map((p, pi) => {
                const amt = Math.round(perPersonAmounts[pi] || 0);
                const msg = buildMessage(p.name, amt);
                return (
                  <Card key={pi}>
                    <CardContent className="p-3 space-y-2">
                      <div className="flex justify-between">
                        <div className="font-semibold">{p.name}</div>
                        <div className="font-bold text-primary">{formatRupiah(amt)}</div>
                      </div>
                      <pre className="text-xs whitespace-pre-wrap bg-muted/50 rounded-md p-2 font-sans text-muted-foreground">{msg}</pre>
                      <div className="flex gap-2">
                        <Button size="sm" className="flex-1" onClick={() => sendWA(p.phone, msg)}>
                          <Send className="h-3.5 w-3.5 mr-1" /> Kirim WA
                        </Button>
                        <Button size="sm" variant="outline" className="flex-1" onClick={() => copyMsg(msg)}>
                          <Copy className="h-3.5 w-3.5 mr-1" /> Salin
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              <Button variant="outline" className="w-full" onClick={resetWizard}>
                Buat split baru
              </Button>
            </div>
          )}
        </TabsContent>

        {/* ============== TAB AKTIF ============== */}
        <TabsContent value="aktif" className="mt-4 space-y-3">
          {loadingActive ? (
            <div className="flex justify-center py-10">
              <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : active.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <div className="text-5xl mb-3">🎉</div>
              <p>Semua tagihan sudah lunas!</p>
            </div>
          ) : (
            // group by transaction
            Object.entries(
              active.reduce<Record<string, ActiveSplit[]>>((acc, s) => {
                acc[s.transaction_id] = acc[s.transaction_id] || [];
                acc[s.transaction_id].push(s);
                return acc;
              }, {})
            ).map(([txId, list]) => (
              <Card key={txId}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 pb-1 border-b border-border">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div className="font-semibold flex-1">{list[0].transactions?.merchant_name || "Tagihan"}</div>
                    <div className="text-xs text-muted-foreground">
                      {list[0].transactions?.transaction_date && relativeDateID(list[0].transactions.transaction_date)}
                    </div>
                  </div>
                  {list.map((s) => (
                    <div key={s.id} className="flex items-center gap-2">
                      <Checkbox checked={false} onCheckedChange={() => markSettled(s.id)} />
                      <div className="flex-1">
                        <div className="text-sm font-medium">{s.member_name}</div>
                        <div className="text-xs text-muted-foreground">{formatRupiah(Number(s.amount_owed))}</div>
                      </div>
                      {s.member_phone && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            sendWA(
                              s.member_phone || "",
                              `Hai ${s.member_name}, ngingetin tagihan ${list[0].transactions?.merchant_name || ""} ya: ${formatRupiah(Number(s.amount_owed))} 🙏`
                            )
                          }
                        >
                          <Send className="h-3.5 w-3.5 mr-1" /> Remind
                        </Button>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))
          )}
        </TabsContent>
      </Tabs>

      {/* Payment info modal */}
      <Dialog open={askPay} onOpenChange={setAskPay}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Info Pembayaran</DialogTitle>
            <DialogDescription>
              Dipakai di pesan WA tagihan. Disimpan di device kamu saja, tidak ke server.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Bank / E-wallet</Label>
              <Input placeholder="BCA / GoPay / DANA..." value={payDraft.bank} onChange={(e) => setPayDraft({ ...payDraft, bank: e.target.value })} />
            </div>
            <div>
              <Label>Nomor rekening / HP</Label>
              <Input value={payDraft.accountNumber} onChange={(e) => setPayDraft({ ...payDraft, accountNumber: e.target.value })} />
            </div>
            <div>
              <Label>Nama pemilik</Label>
              <Input value={payDraft.accountName} onChange={(e) => setPayDraft({ ...payDraft, accountName: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button
              onClick={async () => {
                if (!payDraft.bank || !payDraft.accountNumber || !payDraft.accountName) {
                  toast.error("Lengkapi semua field");
                  return;
                }
                setPaymentInfo(payDraft);
                setAskPay(false);
                if (pendingGenerate) {
                  setPendingGenerate(false);
                  await doGenerate(payDraft);
                }
              }}
            >
              Simpan & Lanjut
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <BottomNav />
    </div>
  );
};

export default SplitBill;
