"use client";

import Sidebar from "@/app/components/Sidebar";

type FieldBase = {
  className?: string;
};

export function Panel({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`p-6 bg-zinc-950/40 border border-zinc-900 rounded-xl backdrop-blur-md ${className}`}
    >
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
      className={`px-4 py-2 bg-white text-black text-xs font-semibold rounded hover:bg-zinc-200 transition-colors active:scale-95 disabled:opacity-50 ${className}`}
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
      className={`px-4 py-2 border border-zinc-700 text-zinc-300 text-xs font-semibold rounded hover:border-zinc-500 hover:text-white transition-colors active:scale-95 disabled:opacity-50 ${className}`}
    >
      {children}
    </button>
  );
}

const fieldBase =
  "w-full bg-black/50 border border-zinc-800 rounded px-3 py-2 text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-600";

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
        className={`${fieldBase} min-h-24 ${className}`}
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
}: {
  children: React.ReactNode;
  eyebrow?: string;
  title: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-black text-white font-sans overflow-x-hidden flex select-none">
      <Sidebar />
      <main className="flex-1 p-10 max-w-7xl mx-auto space-y-8 w-full">
        <header className="flex flex-wrap justify-between items-end gap-4 border-b border-zinc-900 pb-6">
          <div>
            {eyebrow ? (
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-widest mb-1">
                {eyebrow}
              </p>
            ) : null}
            <h1 className="text-3xl font-extrabold tracking-tight">{title}</h1>
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </header>
        {children}
      </main>
    </div>
  );
}
