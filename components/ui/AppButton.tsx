import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = { primary: "border-ink-gold bg-ink-gold text-ink-black hover:bg-transparent hover:text-ink-gold", secondary: "border-ink-gold text-ink-gold hover:bg-ink-gold hover:text-ink-black", ghost: "border-transparent text-ink-grey hover:border-ink-white/20 hover:text-ink-white", success: "border-emerald-400/60 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25", destructive: "border-red-400/60 bg-red-500/10 text-red-200 hover:bg-red-500/20" };
export default function AppButton({ children, variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: keyof typeof variants }) {
  const label = typeof children === "string" ? children.trim().toLocaleUpperCase("pl-PL") : "";
  const tone = variant === "destructive" ? variant : /^(POTWIERD|AKCEPTUJ|PRZECZYTAŁEM)/.test(label) ? "success" : variant;
  return <button {...props} className={`min-h-11 border px-3.5 py-2 text-sm tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-gold disabled:cursor-not-allowed disabled:opacity-50 ${variants[tone]} ${className}`}>{children}</button>;
}
