import * as React from "react";
import { cn } from "../cn";

/** A thin spectrum accent rule — the logo's arc as a divider. */
export function SpectrumBar({ className }: { className?: string }) {
  return <div className={cn("rajask-spectrum-bar h-1 w-full rounded-full", className)} />;
}
