"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { getUserProfile } from "@/lib/auth";
import { displayNameFromProfile } from "@/lib/types";
import { supabase } from "@/lib/supabase";
import { SCROLLBAR } from "@/app/components/ui";

export default function Sidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [menuPath, setMenuPath] = useState<string | null>(null);
  const menuOpen = menuPath === pathname;
  const [displayName, setDisplayName] = useState("User");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    const loadUser = async () => {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!isMounted) return;

      if (error || !user) {
        router.replace("/login");
        return;
      }

      const profile = await getUserProfile(user.id);

      if (!isMounted) return;

      setDisplayName(displayNameFromProfile(profile));
      setAvatarUrl(profile?.avatar_url?.trim() || null);
    };

    loadUser();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const navItems = [
    { label: "Overview", href: "/dashboard" },
    { label: "Personal Tasks", href: "/personal-tasks" },
    { label: "Team", href: "/team" },
    { label: "Team Tasks", href: "/team-tasks" },
    { label: "Parts", href: "/parts" },
    { label: "Part Identifier", href: "/parts/identify" },
    { label: "Engineering Notes", href: "/engineering-notes" },
    { label: "Settings", href: "/settings" },
    
  ];

  return (
    <>
      <button
        type="button"
        className="mobile-menu no-print fixed left-3 top-3 z-50 inline-flex h-11 min-w-11 items-center justify-center rounded-xl bg-zinc-900/40 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50 px-3 text-[10px] font-mono uppercase tracking-widest text-zinc-200 hover:bg-zinc-800/50 hover:border-white/20 transition-all duration-300 ease-out md:hidden"
        onClick={() => setMenuPath(pathname)}
        aria-label="Open menu"
      >
        Menu
      </button>
      {menuOpen ? (
        <button
          type="button"
          className="no-print fixed inset-0 z-40 bg-zinc-950/70 backdrop-blur-sm md:hidden"
          aria-label="Close menu"
          onClick={() => setMenuPath(null)}
        />
      ) : null}
      <aside
        className={`${menuOpen ? "flex" : "hidden"} no-print fixed inset-y-0 left-0 z-50 w-64 overflow-y-auto border-r border-white/10 bg-zinc-900/90 backdrop-blur-xl shadow-2xl shadow-black/50 flex-col justify-between p-6 md:static md:flex md:bg-zinc-900/40 ${SCROLLBAR}`}
      >
      <div>
        {/* Logo */}
        <div className="mb-10">
          <span className="text-sm font-semibold tracking-widest uppercase text-zinc-100">Vulcan</span>
          <img
            src="/src/app/components/51dc49c73.png"
            alt="Vulcan logo"
            className="mt-3 h-14 w-auto object-contain"
          />
        </div>

        {/* Navigation Links */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive =
              item.href === "/engineering-notes"
                ? pathname === item.href || pathname.startsWith("/engineering-notes/")
                : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex min-h-11 items-center space-x-3 px-3 py-2 rounded-xl border text-xs font-mono transition-all duration-300 ease-out ${
                  isActive
                    ? "bg-zinc-800/50 border-white/10 text-zinc-100"
                    : "border-transparent text-zinc-500 hover:bg-zinc-800/50 hover:border-white/20 hover:text-zinc-200"
                }`}
                onClick={() => setMenuPath(null)}
              >
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* User Card at Bottom */}
      <div className="border-t border-white/10 pt-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={`${displayName} avatar`}
              className="h-8 w-8 rounded-full border border-white/10 object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-zinc-800/60 border border-white/10 text-zinc-200 flex items-center justify-center text-xs font-mono font-bold">
              {displayName.charAt(0).toUpperCase() || "V"}
            </div>
          )}
          <div>
            <p className="text-xs font-semibold text-zinc-300">{displayName}</p>
            <p className="text-[10px] font-mono text-zinc-500">Active Session</p>
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <button
            type="button"
            onClick={async () => {
              await supabase.auth.signOut();
              router.replace("/login");
            }}
            className="inline-flex min-h-11 items-center px-2 text-zinc-500 hover:text-zinc-100 transition-colors text-xs font-mono"
          >
            Log out
          </button>
          <Link href="/" className="inline-flex min-h-11 items-center px-2 text-zinc-500 hover:text-zinc-100 transition-colors text-xs font-mono">
            Exit
          </Link>
        </div>
      </div>
      </aside>
    </>
  );
}
