"use client";

import Link from "next/link";
import type { LucideIcon } from "lucide-react";

const tones = {
  default: "border-ink-white/15 text-ink-grey hover:border-ink-gold hover:text-ink-gold",
  gold: "border-ink-gold/45 text-ink-gold hover:border-ink-gold hover:bg-ink-gold/10",
  destructive: "border-red-400/40 text-red-300 hover:border-red-400 hover:bg-red-500/10",
};

type Props = {
  icon: LucideIcon;
  label: string;
  tone?: keyof typeof tones;
  href?: string;
  disabled?: boolean;
  className?: string;
  onClick?: () => void;
};

/** One shared icon-only action used by both the admin and client workspaces. */
export default function ActionIcon({
  icon: Icon,
  label,
  tone = "default",
  href,
  disabled,
  className = "",
  onClick,
}: Props) {
  const classes = `studio-icon-action ${tones[tone]} ${className}`;
  const content = <Icon aria-hidden="true" className="h-4 w-4" />;

  if (href) {
    return <Link href={href} aria-label={label} title={label} className={classes}>{content}</Link>;
  }

  return <button type="button" aria-label={label} title={label} disabled={disabled} onClick={onClick} className={classes}>{content}</button>;
}
