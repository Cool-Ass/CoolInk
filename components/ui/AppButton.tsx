import type { ButtonHTMLAttributes, ReactNode } from "react";

const variants = { primary: "border-ink-gold bg-ink-gold text-ink-black hover:bg-transparent hover:text-ink-gold", secondary: "border-ink-gold text-ink-gold hover:bg-ink-gold hover:text-ink-black", ghost: "border-transparent text-ink-grey hover:border-ink-white/20 hover:text-ink-white", destructive: "border-red-400/60 text-red-300 hover:bg-red-500/10" };
export default function AppButton({ children, variant = "secondary", className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode; variant?: keyof typeof variants }) {
  return <button {...props} className={`border px-4 py-2.5 text-xs tracking-[0.08em] transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink-gold disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}>{children}</button>;
}
