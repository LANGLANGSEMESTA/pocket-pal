import { ReactNode } from "react";
import { Sparkles, Lock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Modal yang muncul saat user Free mencoba memakai fitur Pro.
 */
export const ProUpsellDialog = ({
  open,
  onOpenChange,
  feature,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  feature: string;
}) => {
  const navigate = useNavigate();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" /> Fitur Pro
          </DialogTitle>
          <DialogDescription>
            <span className="font-semibold text-foreground">{feature}</span> hanya tersedia untuk pengguna Pro.
            Upgrade sekarang mulai Rp 15.000/bulan untuk akses penuh: voice input, scan struk, dan kirim laporan ke orang tua.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Nanti</Button>
          <Button onClick={() => { onOpenChange(false); navigate("/upgrade"); }}>
            <Sparkles className="h-4 w-4 mr-1.5" /> Upgrade ke Pro
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/**
 * Pembungkus visual yang menambahkan badge Lock + onClick untuk children
 * yang membuka upsell dialog. Tidak menggantikan logic, hanya overlay.
 */
export const ProLockBadge = ({ children, onClick }: { children: ReactNode; onClick: () => void }) => (
  <button
    type="button"
    onClick={onClick}
    className="relative w-full text-left"
    aria-label="Fitur Pro - upgrade dulu"
  >
    <div className="opacity-60 pointer-events-none">{children}</div>
    <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow">
      <Lock className="h-2.5 w-2.5" /> PRO
    </div>
  </button>
);