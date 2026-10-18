# Layout-prompt — visualising the engineering notebook before building it

Copy one block below into an image model (Midjourney, DALL·E, Ideogram, Firefly, Stable Diffusion). Each is self-contained.

**Tips**
- Prefer **Ideogram** or **DALL·E 3** for these — they render UI text far more reliably than Midjourney.
- Text in generated UI images is usually *close but imperfect*. Treat labels as indicative; judge **layout, proportion, density, and hierarchy**, not spelling.
- Generate the desktop prompt at **16:9** (`--ar 16:9`) and the mobile prompt at **9:16** (`--ar 9:16`).
- Run variant 1 first. It is the default screen and the one the rest of the design hangs off.

---

## Variant 1 — Day view (desktop, default screen)

```
A high-fidelity UI design mockup of a web app screen called "Engineering Notebook",
for a robotics team management tool. Premium developer dark mode. Vercel-inspired.

OVERALL STYLE
Absolute black background (#000000). Very subtle procedural hairline grid lines
across the background, masked to fade at the edges. Surfaces are semi-translucent
dark zinc panels (#0a0a0b at 40% opacity) with heavy backdrop blur, 1px borders in
dark zinc (#27272a), 12px corner radius. Strictly monochrome: black, white, and a
six-step zinc grey ramp. One tiny neon-emerald dot as the only accent colour, used
as a live-status indicator. Typography: tight, bold, compressed sans-serif for
headings; small uppercase monospaced labels with wide letter-spacing for all
metadata, counts, timestamps, and tabs. Dense information-dense layout, generous
negative space between panels but compact inside them. No shadows stacking, no
gradients except a subtle white-to-grey on the main heading, no rounded pill shapes,
no icons in colour, no emoji.

LAYOUT — four regions
1. Far-left vertical sidebar, 260px wide, full height, slightly separated by a 1px
   vertical zinc border. Top: a small uppercase wordmark "VULCAN" and a simple
   geometric logo mark. Below it, a vertical navigation list of seven items in tiny
   uppercase monospaced type, evenly spaced: "OVERVIEW", "PERSONAL TASKS", "TEAM",
   "TEAM TASKS", "PARTS", "PART IDENTIFIER", "ENGINEERING NOTES". The last item is
   the active one: its row has a subtly lighter zinc background block and white text,
   the rest are dim mid-grey. Bottom of the sidebar: a thin divider, then a small
   circular avatar, a display name, and the words "ACTIVE SESSION" beneath in micro
   monospaced caps, plus "LOG OUT" in the corner.

2. Top header bar above the content, separated by a 1px horizontal border. Small
   uppercase monospaced eyebrow "ENGINEERING NOTEBOOK" in mid-grey, and beneath it a
   large bold heading reading "October 17, 2026" in white. On the right side of the
   header, two buttons aligned to the baseline: a solid white button with black
   uppercase monospaced text "UPDATE NOTEBOOK", and an outlined dark button with
   light text "EXPORT".

3. A horizontal row of three subteam tabs directly under the header: "SOFTWARE",
   "HARDWARE", "BUSINESS" in uppercase monospaced type. The first is active — white
   text with a 2px white underline; the others are dim grey with no underline. On the
   far right of this same row, a small segmented control with three options —
   "DAY", "TIMELINE", "DOCUMENT" — where "DAY" is the active segment, shown as a
   light zinc block with white text, the others plain grey.

4. The main content area is split into two columns: a wide left column taking about
   62% of the width, and a narrower right column taking the rest, separated by a
   comfortable gutter.

LEFT COLUMN — "the curated notebook"
A tall translucent dark panel with a header row reading "SOFTWARE · CURATED" in
micro monospaced caps on the left and a small grey "EDITED" label plus a pencil
glyph on the right. Inside, three stacked sections separated by very thin zinc
dividers, each with a small uppercase monospaced section heading:
"ACCOMPLISHMENTS", then a tight bulleted list of five short lines of realistic
robotics prose in light grey sans-serif.
"LESSONS LEARNED", then three bullet lines.
"TO-BE-COMPLETED", then a short bulleted list where two lines end with tiny
monospaced chip labels like "TASK · IN PROGRESS".
Inline with the text, scattered naturally through the accomplishments section, are
two small rectangular thumbnails of hardware photographs (an aluminium robot
chassis close-up, a wiring harness) each captioned underneath in tiny grey
monospaced type. Also inline in the prose are tiny pill-shaped citation chips with
monospaced text such as "NOTE · 14:32 · ADA" and "NOTE · 15:07 · MARCUS", rendered
as subtle outlined labels, not coloured.

RIGHT COLUMN — "raw notecards"
A full-height translucent dark panel with a sticky header reading "RAW NOTECARDS"
in micro monospaced caps, with a small grey count "12" on the right.
Directly beneath the header, a compact composer card: a narrow date field showing
"10/17/2026", a small two-line text area with placeholder text in dark grey, a row
of three tiny outline icon buttons (camera, image upload, tag), and a small white
"POST" button bottom-right.
Below the composer, a vertically scrolling stack of five note cards. Each card is a
slightly lighter dark surface with a rounded corner, containing: a top line of micro
monospaced metadata ("14:32", an author name, a small subteam tag "HARDWARE"), then
two or three lines of short casual student prose in light grey, and for two of the
cards a row of one to three small square photo thumbnails. Cards are separated by
generous vertical spacing. One card is subtly highlighted with a brighter 1px
outline and a faint zinc fill to indicate it is currently referenced by the curated
notebook.

MOOD
Calm, precise, engineered. Reads like professional developer tooling, not a student
project. Screenshot-like flat rendering, straight-on view, no perspective, no device
frame, no floating mockup, no perspective tilt. Crisp 1px hairlines everywhere.
```

**Negative prompt** (for Stable Diffusion / ComfyUI):

```
colorful, purple, violet, gradient background, glassmorphism rainbow, neumorphism,
drop shadows, 3d perspective, device mockup, phone frame, lorem ipsum gibberish,
emoji, rounded pill buttons, heavy borders, light mode, pastel, illustration,
cartoon, low contrast, blurry text, watermark
```

---

## Variant 2 — Timeline mode

Use Variant 1 as the base and change the left column only:

```
...same sidebar, same header showing "October 17, 2026", same subteam tab row, same
segmented control but with "TIMELINE" now the active segment.

The left column is replaced by a vertical timeline. A single thin vertical hairline
runs down the left edge of the column. Along it, ten evenly spaced circular points
descend from top to bottom, newest date at the top. Each point connects to a
horizontal row to its right containing: a bold date label "OCT 17" in white, a
three-character micro monospaced weekday, then a row of two or three tiny filled
dots indicating which subteams have content, then a line of small grey count text
like "4 NOTES · CURATED", and beneath it a single truncated line of grey preview
prose. Some points are rendered as solid bright white circles with a glowing ring to
mark dates that have a generated notebook; others are smaller hollow grey rings for
dates with notes only. The most recent point is slightly larger and clearly the
current focus. The dates descend in order: OCT 17, OCT 15, OCT 14, OCT 10, OCT 08,
OCT 03, SEP 29, SEP 26, SEP 22, SEP 19. Right column of raw notecards stays exactly
as in Variant 1.
```

---

## Variant 3 — Document mode

```
...same sidebar and header. The segmented control now shows "DOCUMENT" as the active
option. The subteam tab row is dimmed and shown as a filter.

The main content area becomes a single wide, centered, pageless document column —
no panel borders around the whole thing, just a wide reading measure of about 720px
centered in the available space, with a generous left and right margin. Running down
the document in chronological order, oldest at the top: large bold white date
headings such as "October 17, 2026" and "October 15, 2026", each followed by a
smaller uppercase monospaced subteam sub-heading like "SOFTWARE" and then section
headings in micro monospaced caps ("ACCOMPLISHMENTS", "LESSONS LEARNED",
"TO-BE-COMPLETED") with dense grey body prose and bullets beneath. Hardware photos
appear inline between paragraphs with small captions. Faint citation chips appear
inline in the prose.

On the right edge of the viewport floats a narrow sticky outline rail, 160px wide,
listing the dates as tiny uppercase monospaced links, with the currently visible
date marked by a short white vertical bar. No raw notecard column in this mode — it
is collapsed.
```

---

## Variant 4 — Mobile (390 × 844)

```
A high-fidelity mobile UI design mockup of the same "Engineering Notebook" product,
single column, 390px wide, tall phone ratio. Same design language: absolute black
background, translucent dark zinc surfaces, 1px zinc hairlines, strictly monochrome
with one tiny emerald status dot, bold compressed sans headings, uppercase
monospaced micro labels.

TOP: a slim app bar with a small back chevron, the centered title "OCT 17" in bold
white uppercase monospaced type, and a small overflow menu glyph on the right.
Beneath it, a horizontally scrolling row of subteam tabs "SOFTWARE / HARDWARE /
BUSINESS" where SOFTWARE is active with a white underline and the row is visibly cut
off at the right edge to imply scrolling.
Beneath that, a full-width segmented control "DAY / TIMELINE / DOC" with DAY active.
Beneath that, a single full-width translucent panel containing the curated notebook:
micro heading "SOFTWARE · CURATED", section heading "ACCOMPLISHMENTS" with four
tight bullet lines of grey prose, one inline hardware photo thumbnail spanning the
panel width with a tiny caption, two small citation chips in the prose, then the
section heading "LESSONS LEARNED" with two bullets, then "TO-BE-COMPLETED" with
three bullets.

BOTTOM: the raw notecard column is collapsed into a partially raised bottom sheet
that covers the lower third of the screen. The sheet has a small centered grabber
bar, a header "RAW NOTECARDS · 12", one visible note card with micro metadata
"14:32 · ADA · HARDWARE" and two short grey lines plus a tiny square photo
thumbnail, and a floating circular white "＋" button in the bottom-right corner
overlapping the sheet edge.

Nothing is cut off horizontally. Tap targets look comfortably large. Portrait
orientation, flat straight-on screenshot rendering, no phone hardware frame.
```
