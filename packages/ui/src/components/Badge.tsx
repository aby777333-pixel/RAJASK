import * as React from "react";
import { cn } from "../cn";

type Tone = "neutral" | "gold" | "success" | "warning" | "danger";

const TONES: Record<Tone, string> = {
  neutral: "bg-white/8 text-ivory/80",
  gold: "bg-gold/15 text-gold",
  success: "bg-spectrum-green/20 text-spectrum-lime",
  warning: "bg-spectrum-orange/20 text-spectrum-orange",
  danger: "bg-spectrum-crimson/20 text-spectrum-crimson",
};

export function Badge({
  tone = "neutral",
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium",
        TONES[tone],
        className,
      )}
      {...props}
    />
  );
}
