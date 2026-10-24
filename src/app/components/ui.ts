/**
 * Vulcan global design tokens as Tailwind class strings.
 *
 * Keep these as complete, literal strings so Tailwind's source scanner
 * generates every utility. Do not build class names by concatenating
 * fragments.
 */

/** Dark glass scrollbars. Apply to every scrollable container. */
export const SCROLLBAR =
  "[&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-white/10 [&::-webkit-scrollbar-thumb]:backdrop-blur-md [&::-webkit-scrollbar-thumb]:rounded-full hover:[&::-webkit-scrollbar-thumb]:bg-white/20";

/** Page base: zinc-950 with a soft radial glow at the top. */
export const PAGE_BG =
  "bg-zinc-950 text-zinc-100 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-black";

/** Glass surface shared by cards, panels, sheets. Add a radius separately. */
export const GLASS =
  "bg-zinc-900/40 backdrop-blur-xl border border-white/10 shadow-2xl shadow-black/50";

/** Hover / active treatment for interactive glass surfaces. */
export const GLASS_HOVER =
  "hover:bg-zinc-800/50 hover:border-white/20 transition-all duration-300 ease-out";

/** Cards and panels. */
export const CARD = `${GLASS} rounded-2xl`;

/** Interactive cards and panels. */
export const CARD_INTERACTIVE = `${CARD} ${GLASS_HOVER}`;

/** Primary action: gradient fill. 44px minimum touch target. */
export const BTN_PRIMARY =
  "inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-zinc-950 text-xs font-semibold shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/30 hover:opacity-95 transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100";

/** Secondary action: low-chroma glass. 44px minimum touch target. */
export const BTN_SECONDARY =
  "inline-flex min-h-11 items-center justify-center gap-2 px-4 py-2 rounded-xl bg-zinc-800/60 hover:bg-zinc-700/60 text-zinc-200 border border-white/10 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 disabled:active:scale-100";

/** Text inputs, selects, textareas. 44px minimum touch target. */
export const INPUT =
  "w-full min-h-11 rounded-xl bg-zinc-900/50 border border-white/10 px-4 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-500 focus:outline-none focus:border-emerald-400/40 focus:ring-2 focus:ring-emerald-500/20 transition-all disabled:opacity-50";

/** Small uppercase mono label that sits above a form field. */
export const FIELD_LABEL =
  "block text-[10px] font-mono text-zinc-500 uppercase tracking-widest mb-1.5";

/** Small metadata chip (counts, tags). */
export const CHIP =
  "inline-flex items-center rounded-lg border border-white/10 bg-zinc-800/60 px-2 py-0.5 text-[10px] font-mono text-zinc-400";

/** Horizontal scroll row with soft edge fades, for tab lists and columns. */
export const H_SCROLL = `overflow-x-auto [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] ${SCROLLBAR}`;

/**
 * Kanban board row. Below md the columns sit in a horizontal snap-scroll
 * strip with edge fade masks (the 10% side padding keeps the first and last
 * column clear of the fade). From md up it is a normal grid.
 */
export const KANBAN_ROW = `flex items-start gap-4 overflow-x-auto snap-x snap-mandatory pb-2 max-md:px-[10%] max-md:[mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] md:grid md:grid-cols-2 md:overflow-visible md:pb-0 xl:grid-cols-4 ${SCROLLBAR}`;

/** Kanban column surface. Add a min-height per board. */
export const KANBAN_COL = `${CARD} flex w-[80%] shrink-0 snap-center flex-col space-y-3 p-3 md:w-auto md:shrink`;

/** Full-screen scrim for modals. Sheet-aligned on mobile, centred from md up. */
export const MODAL_BACKDROP =
  "no-print fixed inset-0 z-50 flex items-end justify-center bg-zinc-950/80 backdrop-blur-sm md:items-center md:p-4";

/**
 * Modal surface: bottom sheet (`rounded-t-3xl`) below md, centred
 * `rounded-3xl` dialog from md up. Append a max-width.
 */
export const MODAL_SHEET = `vulcan-sheet w-full max-h-[90dvh] overflow-y-auto rounded-t-3xl md:rounded-3xl ${GLASS} ${SCROLLBAR}`;
