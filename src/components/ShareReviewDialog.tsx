import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Download, Share2, Copy, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import type { Album } from "@/lib/albums";
import type { TierId } from "@/lib/tiers";
import {
  renderShareCard,
  shareCardToBlob,
  downloadBlob,
  buildShareCaption,
  type ShareCardData,
} from "@/lib/share-card";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: ShareCardData | null;
};

export function ShareReviewDialog({ open, onOpenChange, data }: Props) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [rendering, setRendering] = useState(false);

  useEffect(() => {
    if (!open || !data) return;
    let cancelled = false;
    let url: string | null = null;
    setRendering(true);
    setPreviewUrl(null);
    (async () => {
      const blob = await shareCardToBlob(data);
      if (cancelled) return;
      if (blob) {
        url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      }
      setRendering(false);
    })();
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
      else setPreviewUrl((u) => {
        if (u) URL.revokeObjectURL(u);
        return null;
      });
    };
  }, [open, data]);

  if (!data) return null;
  const caption = buildShareCaption(data);
  const safeName = data.album.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const download = async () => {
    const blob = await shareCardToBlob(data);
    if (!blob) {
      toast.error("Couldn't create the image. Please try again.");
      return;
    }
    downloadBlob(blob, `lyniv-${safeName || "review"}.png`);
  };

  const share = async () => {
    const blob = await shareCardToBlob(data);
    if (!blob) {
      toast.error("Couldn't create the image. Please try again.");
      return;
    }
    const file = new File([blob], `lyniv-${safeName || "review"}.png`, { type: "image/png" });
    const nav = navigator as Navigator & {
      canShare?: (d: { files?: File[] }) => boolean;
      share?: (d: { files?: File[]; text?: string; title?: string }) => Promise<void>;
    };
    if (nav.share && nav.canShare?.({ files: [file] })) {
      try {
        await nav.share({ files: [file], text: caption, title: "My Lyniv review" });
        return;
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        // fall through to download
      }
    }
    downloadBlob(blob, `lyniv-${safeName || "review"}.png`);
    toast("Image saved — attach it to your post");
  };

  const copyCaption = async () => {
    try {
      await navigator.clipboard.writeText(caption);
      toast.success("Caption copied");
    } catch {
      toast.error("Couldn't copy the caption");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">Share this review</DialogTitle>
          <DialogDescription>
            Save the card and post it to your stories or feeds, or share it directly.
          </DialogDescription>
        </DialogHeader>

        <div className="flex justify-center">
          {rendering ? (
            <div className="flex aspect-square w-72 items-center justify-center rounded-xl bg-elevated">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
            ) : previewUrl ? (
            <img
              src={previewUrl}
              alt="Share card preview of your review"
              className="w-72 rounded-xl shadow-card"
            />
          ) : (
            <div className="flex aspect-square w-72 items-center justify-center rounded-xl bg-elevated text-sm text-muted-foreground">
              Preview unavailable — you can still download the image.
            </div>
          )}
        </div>

        <div className="grid gap-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={share}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-primary py-2.5 text-sm font-bold text-primary-foreground transition hover:scale-[1.02]"
            >
              <Share2 className="h-4 w-4" /> Share
            </button>
            <button
              onClick={download}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-elevated py-2.5 text-sm font-bold text-foreground transition hover:scale-[1.02]"
            >
              <Download className="h-4 w-4" /> Save image
            </button>
          </div>
          <button
            onClick={copyCaption}
            className="inline-flex items-center justify-center gap-2 rounded-full border border-border py-2.5 text-sm font-bold text-muted-foreground transition hover:text-foreground"
          >
            <Copy className="h-4 w-4" /> Copy caption
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
