"use client";

import { searchPartCatalog } from "@/lib/parts";
import type { PartCatalog } from "@/lib/types";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

type CatalogPickerProps = {
  teamId: string;
  value: PartCatalog | null;
  onChange: (value: PartCatalog | null) => void;
  disabled?: boolean;
};

type Row =
  | { kind: "header"; label: string }
  | { kind: "option"; item: PartCatalog; index: number };

const SEARCH_DEBOUNCE_MS = 200;

/**
 * Searchable catalog picker.
 *
 * Results are fetched per query in bounded pages, so the picker stays usable
 * once the official catalog holds thousands of parts. An empty query still
 * lists results — browsing the whole catalog stays possible, and "Load more"
 * pages to the end.
 */
export default function CatalogPicker({
  teamId,
  value,
  onChange,
  disabled = false,
}: CatalogPickerProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<PartCatalog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [highlighted, setHighlighted] = useState(0);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLInputElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);
  const requestGeneration = useRef(0);
  const listboxId = useId();

  const load = useCallback(
    async (nextQuery: string, nextPage: number, append: boolean) => {
      const generation = ++requestGeneration.current;
      setLoading(true);
      setError(null);
      try {
        const result = await searchPartCatalog({
          teamId,
          query: nextQuery,
          page: nextPage,
        });
        if (generation !== requestGeneration.current) return;
        setItems((prev) => (append ? [...prev, ...result.items] : result.items));
        setTotal(result.total);
        setPage(nextPage);
        if (!append) setHighlighted(0);
      } catch (e) {
        if (generation !== requestGeneration.current) return;
        setError(e instanceof Error ? e.message : "Failed to search parts");
      } finally {
        if (generation === requestGeneration.current) setLoading(false);
      }
    },
    [teamId]
  );

  // Fetch whenever the picker opens or the query changes (debounced).
  useEffect(() => {
    if (!open) return;
    const handle = setTimeout(
      () => void load(query, 0, false),
      query.trim() ? SEARCH_DEBOUNCE_MS : 0
    );
    return () => clearTimeout(handle);
  }, [open, query, load]);

  // Dismiss on outside click.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    searchRef.current?.focus();
  }, [open]);

  const rows = useMemo<{ list: Row[]; optionCount: number }>(() => {
    const officialItems = items.filter((item) => item.is_official);
    const teamItems = items.filter((item) => item.team_id === teamId);
    const list: Row[] = [];
    let index = 0;

    if (officialItems.length > 0) {
      list.push({ kind: "header", label: "Official parts" });
      for (const item of officialItems) list.push({ kind: "option", item, index: index++ });
    }
    if (teamItems.length > 0) {
      list.push({ kind: "header", label: "Team parts" });
      for (const item of teamItems) list.push({ kind: "option", item, index: index++ });
    }

    return { list, optionCount: index };
  }, [items, teamId]);

  // Keep the highlighted option visible while arrowing through the list.
  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector(`[data-option-index="${highlighted}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [highlighted, open]);

  const choose = (item: PartCatalog | null) => {
    onChange(item);
    setOpen(false);
    setQuery("");
  };

  const handleSearchKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((current) => Math.min(current + 1, Math.max(rows.optionCount - 1, 0)));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      const option = rows.list.find(
        (row): row is Extract<Row, { kind: "option" }> =>
          row.kind === "option" && row.index === highlighted
      );
      if (option) choose(option.item);
    }
  };

  const triggerLabel = value
    ? `${value.name}${value.sku ? ` · ${value.sku}` : ""}`
    : "Create a new catalog item";

  const hasMore = items.length < total;

  return (
    <div ref={containerRef} className="relative md:col-span-2">
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          if (next) setLoading(true);
          setOpen(next);
        }}
        className="w-full bg-black/50 border border-zinc-800 rounded px-3 py-2 text-sm text-left flex items-center justify-between gap-3 focus:outline-none focus:border-zinc-600 disabled:opacity-50"
      >
        <span className={value ? "text-zinc-200 truncate" : "text-zinc-500 truncate"}>
          {triggerLabel}
        </span>
        <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 shrink-0">
          {open ? "Close" : "Select"}
        </span>
      </button>

      {open ? (
        <div className="absolute z-20 mt-1 w-full bg-zinc-950/95 border border-zinc-800 rounded-lg backdrop-blur-md overflow-hidden">
          <div className="flex items-center gap-2 border-b border-zinc-900 px-3 py-2">
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search parts by name…"
              aria-label="Search parts by name"
              aria-controls={listboxId}
              aria-activedescendant={
                rows.optionCount > 0 ? `${listboxId}-option-${highlighted}` : undefined
              }
              className="w-full bg-transparent text-sm text-zinc-200 placeholder:text-zinc-600 focus:outline-none"
            />
            {loading ? (
              <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600 shrink-0">
                Loading
              </span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={() => choose(null)}
            className="w-full text-left px-3 py-2 text-xs font-mono uppercase tracking-wider text-zinc-400 hover:bg-zinc-900 hover:text-white border-b border-zinc-900"
          >
            + Create a new catalog item
          </button>

          <div ref={listRef} id={listboxId} role="listbox" className="max-h-72 overflow-y-auto">
            {error ? (
              <p className="px-3 py-3 text-xs font-mono text-rose-400">{error}</p>
            ) : null}

            {!error && !loading && rows.optionCount === 0 ? (
              <p className="px-3 py-3 text-xs font-mono text-zinc-500">
                {query.trim()
                  ? "No catalog parts match that name."
                  : "No catalog parts available yet."}
              </p>
            ) : null}

            {rows.list.map((row) =>
              row.kind === "header" ? (
                <p
                  key={`header-${row.label}`}
                  className="px-3 pt-3 pb-1 text-[10px] font-mono uppercase tracking-widest text-zinc-500"
                >
                  {row.label}
                </p>
              ) : (
                <div
                  key={row.item.id}
                  id={`${listboxId}-option-${row.index}`}
                  role="option"
                  aria-selected={highlighted === row.index}
                  data-option-index={row.index}
                  onMouseEnter={() => setHighlighted(row.index)}
                  onClick={() => choose(row.item)}
                  className={`px-3 py-2 cursor-pointer ${
                    highlighted === row.index ? "bg-zinc-900" : ""
                  }`}
                >
                  <p className="text-sm text-zinc-200 truncate">{row.item.name}</p>
                  <p className="text-[10px] font-mono text-zinc-600 truncate mt-0.5">
                    {row.item.sku ? `SKU ${row.item.sku}` : "No SKU"}
                    {row.item.manufacturer ? ` · ${row.item.manufacturer}` : ""}
                  </p>
                </div>
              )
            )}
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-900 px-3 py-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-zinc-600">
              Showing {items.length} of {total}
            </span>
            {hasMore ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => void load(query, page + 1, true)}
                className="text-[10px] font-mono uppercase tracking-widest text-zinc-400 hover:text-white disabled:opacity-50"
              >
                Load more
              </button>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
