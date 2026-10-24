"use client";

import Sidebar from "@/app/components/Sidebar";
import {
  BTN_PRIMARY,
  BTN_SECONDARY,
  CARD,
  CARD_INTERACTIVE,
  INPUT,
  PAGE_BG,
  SCROLLBAR,
} from "@/app/components/ui";

type FieldBase = {
  className?: string;
};

export function Panel({
  children,
  className = "",
  interactive = false,
}: {
  children: React.ReactNode;
  className?: string;
  /** Adds the hover/active glass treatment for clickable surfaces. */
  interactive?: boolean;
}) {
  return (
    <div className={`p-6 ${interactive ? CARD_INTERACTIVE : CARD} ${className}`}>
      {children}
    </div>
  );
}

export function Label({ children }: { children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-500">
      {children}
    </span>
  );
}

export function PrimaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`${BTN_PRIMARY} ${className}`}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      {...props}
      className={`${BTN_SECONDARY} ${className}`}
    >
      {children}
    </button>
  );
}

const fieldBase = INPUT;

export function FieldInput(
  props:
    | (React.InputHTMLAttributes<HTMLInputElement> & FieldBase & { as?: "input" })
    | (React.TextareaHTMLAttributes<HTMLTextAreaElement> &
        FieldBase & { as: "textarea" })
    | (React.SelectHTMLAttributes<HTMLSelectElement> &
        FieldBase & { as: "select"; children?: React.ReactNode })
) {
  const { as = "input", className = "", ...rest } = props;

  if (as === "textarea") {
    return (
      <textarea
        {...(rest as React.TextareaHTMLAttributes<HTMLTextAreaElement>)}
        className={`${fieldBase} min-h-24 ${SCROLLBAR} ${className}`}
      />
    );
  }

  if (as === "select") {
    const { children, ...selectRest } =
      rest as React.SelectHTMLAttributes<HTMLSelectElement> & {
        children?: React.ReactNode;
      };
    return (
      <select {...selectRest} className={`${fieldBase} ${className}`}>
        {children}
      </select>
    );
  }

  return (
    <input
      {...(rest as React.InputHTMLAttributes<HTMLInputElement>)}
      className={`${fieldBase} ${className}`}
    />
  );
}

export function ErrorText({ children }: { children: React.ReactNode }) {
  if (!children) return null;
  return <p className="text-xs font-mono text-rose-400">{children}</p>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="text-xs font-mono text-zinc-500">{children}</p>;
}

export default function AppShell({
  children,
  eyebrow,
  title,
  actions,
  workspace = false,
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  actions?: React.ReactNode;
  workspace?: boolean;
}) {
  return (
    <div className={`min-h-screen ${PAGE_BG} font-sans flex ${workspace ? "h-dvh overflow-hidden" : "overflow-x-hidden"}`}>
      <Sidebar />
      <main
        className={
          workspace
            ? "flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden px-3 pt-16 pb-3 md:p-6"
            : "flex-1 min-w-0 px-4 pt-16 pb-4 md:p-10 max-w-7xl mx-auto space-y-8 w-full"
        }
      >
        <header className="no-print flex flex-wrap justify-between items-end gap-4 border-b border-white/10 pb-4 md:pb-6">
          <div>
            {eyebrow ? (
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-100">{title}</h1>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}
