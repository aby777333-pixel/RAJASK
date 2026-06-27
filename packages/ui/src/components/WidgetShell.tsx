import * as React from "react";
import type { Subsystem } from "@rajask/core";
import { subsystemHex, SUBSYSTEM_LABEL } from "../tokens";
import { Card, CardBody, CardHeader } from "./Card";
import { cn } from "../cn";

export interface WidgetShellProps {
  subsystem: Subsystem;
  /** Override the widget heading; defaults to the subsystem name. */
  title?: string;
  action?: React.ReactNode;
  className?: string;
  children?: React.ReactNode;
}

/**
 * The THRONE widget container. Each widget wears its subsystem's facet colour
 * as a left accent + dot, so the command dashboard is colour-coded by domain.
 */
export function WidgetShell({
  subsystem,
  title,
  action,
  className,
  children,
}: WidgetShellProps) {
  const hex = subsystemHex(subsystem);
  const meta = SUBSYSTEM_LABEL[subsystem];
  return (
    <Card
      className={cn("relative overflow-hidden", className)}
      style={{ borderLeft: `3px solid ${hex}` }}
    >
      <CardHeader className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="inline-block h-2.5 w-2.5 rounded-full"
            style={{ backgroundColor: hex }}
            aria-hidden
          />
          <div>
            <h3 className="text-sm font-semibold text-ivory">{title ?? meta.name}</h3>
            <p className="text-[11px] text-ivory/40">{meta.tagline}</p>
          </div>
        </div>
        {action}
      </CardHeader>
      <CardBody>{children}</CardBody>
    </Card>
  );
}
