---
name: NotesNexa
description: A warm, quiet workspace for notes, Markdown and personal tasks.
colors:
  cream: "#f4f0e7"
  paper: "#fcfaf5"
  surface: "#eae5da"
  ink: "#252621"
  muted: "#6a685f"
  line: "#dcd7cb"
  orange: "#17645c"
  orange-light: "#dbece6"
  dark: "#22241f"
typography:
  display:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "clamp(52px, 5.1vw, 81px)"
    fontWeight: 400
    lineHeight: 1.02
    letterSpacing: "-2px"
  headline:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "clamp(42px, 4vw, 62px)"
    fontWeight: 400
    lineHeight: 1.04
    letterSpacing: "-1.5px"
  title:
    fontFamily: "DM Serif Display, Georgia, serif"
    fontSize: "36px"
    fontWeight: 400
    lineHeight: 1.2
    letterSpacing: "-1px"
  body:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "14px"
    lineHeight: 1.95
  label:
    fontFamily: "DM Sans, sans-serif"
    fontSize: "12px"
    fontWeight: 500
rounded:
  field: "6px"
  button: "7px"
  icon: "8px"
  card: "10px"
  editor: "12px"
  dialog: "14px"
  story: "17px"
spacing:
  card-gap: "17px"
  card-inset: "21px"
  editor-inset: "28px"
  workspace-inset: "42px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.button}"
    padding: "0 22px"
    height: "47px"
  button-primary-hover:
    backgroundColor: "{colors.orange}"
    textColor: "{colors.paper}"
  button-outline:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.button}"
    padding: "0 22px"
  note-card:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.ink}"
    rounded: "{rounded.card}"
    padding: "21px"
  editor:
    backgroundColor: "{colors.paper}"
    rounded: "{rounded.editor}"
  field:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.field}"
    padding: "0 15px"
    height: "49px"
---

# Design System: NotesNexa

## Overview

**Creative North Star: "A Little Space"**

NotesNexa pairs a warm editorial opening with the density of a working notes app. Cream and paper surfaces, dark ink, burnt orange accents and expressive serif titles make personal work feel approachable. Controls stay familiar and the writing surface stays still.

The user selected cream, black and orange and delegated the detailed aesthetic. The implementation adapts editorial hierarchy from the [Impeccable boutique gallery](https://impeccable.style/gallery/view/7425f4a6c67b9b48/) and dimensional material character from [GetLayers Gravity](https://www.getlayers.ai/layer/gravity-webgl). The original interlocking sculpture uses Three.js geometry. Motion behavior draws on [Emil Kowalski](https://github.com/emilkowalski/skills); [Taste Skill](https://github.com/Leonxlnx/taste-skill) informed visual review. These are provenance references, not template ownership or fidelity claims.

**Key Characteristics:**

- Warm paper surfaces with restrained orange emphasis.
- Serif headings and sans-serif working controls.
- One dimensional opening sculpture; short responses during work.
- Responsive navigation, editable titles and readable Markdown.

## Colors

The primary accent is burnt orange against warm neutrals. The YAML records the default light theme; dark theme overrides live in the sidecar and `src/styles.css`.

### Primary

- **Burnt Orange** (`orange`): emphasis in italic headings, icons, reminders, selection borders, checkbox completion and focus treatments.
- **Pale Terracotta** (`orange-light`): selected note surfaces, form errors and input focus halos.

### Neutral

- **Cream** (`cream`): page background.
- **Paper** (`paper`): note cards, editors, dialogs and date card.
- **Warm Surface** (`surface`): selected editor tabs, count pills, code backgrounds and neutral hover fills.
- **Ink** (`ink`): text and default primary buttons.
- **Muted Ink** (`muted`): descriptions, metadata and secondary controls.
- **Paper Edge** (`line`): dividers and resting borders.
- **Deep Ink** (`dark`): authentication story and persistent sidebar; this remains dark in both themes.

The sidebar uses its own warm peach action and active-navigation colors. The sculpture material is orange `#e65d24`; lighting changes its rendered appearance rather than matching the UI accent exactly.

## Typography

**Display Font:** DM Serif Display, Georgia, serif. **Body Font:** DM Sans, sans-serif. Both DM families are self-hosted in `static/fonts/` with their licenses. There is no separate branded monospace family; code uses the browser's code styling.

Serif headings are regular weight, often with orange italic emphasis. Sans-serif labels remain sentence case. Preserve spaces at JSX boundaries when emphasis divides a sentence.

### Hierarchy

- **Display:** authentication story, 400 weight, YAML clamp, 1.02 line height. Explicit responsive sizes are 61px at 1200px, 49px at 950px, 41px at 700px, 36px at 450px and 31px at 350px.
- **Headline:** workspace introduction, YAML clamp; 44px at 950px, 42px at 700px, 36px at 450px and 39px at 350px when the date card disappears. Authentication form headings are 45px/1.15, 36px at 950px and 38px at 700px.
- **Title:** editor title is 36px/1.2; 30px at 1200px, restored to 36px at 950px, 31px at 700px and 28px at 350px. Note-card titles are 23px/1.2, 19px in the compact list and 25px below 450px.
- **Body:** editor text is 14px/1.95 (1.9 on mobile); Markdown preview is 14px/1.9. Note excerpts are 13px/1.8, compact excerpts 12px. Auth explanatory copy is 13px/1.75 with a 38ch maximum.
- **Label:** form labels 12px/500; primary buttons 14px/500; navigation 13px. Editor metadata is 11px, 10px at 700px. Some supporting details intentionally use smaller sizes; do not apply their size to working text.

## Layout

Authentication uses a 1600px maximum container, 30px outer gutters and a `1.12fr 1fr` split. The story has a 650px minimum height; form content is capped at 390px. Above 1600px, gutters become 45px and the story reaches 740px. At 700px and below the story and form stack; the story becomes a two-column composition with copy and sculpture, while form content can reach 420px.

The workspace fixes a 242px sidebar beside a flexible body. Its main content has 42px horizontal padding and a 1650px maximum width. Sidebar width steps down to 215px at 1200px and 195px at 950px. At 700px it becomes a 250px sliding drawer with a scrim, open/close controls and inert hidden content. Main gutters then become 22px, 20px at 450px and 16px at 350px.

Collections use three equal columns with 17px gaps, two columns at 1200px and one at 450px. Selecting an item creates a 265px compact list plus editor (220px at 1200px); the list is hidden below 950px and the editor's back action returns to the collection. Split Markdown remains side by side until 450px, then stacks. Dialog width is `min(450px, calc(100% - 32px))`.

Titles use an autosized textarea with hidden overflow and no manual resize. They wrap at narrow widths; content changes and viewport resizes recalculate their height. There is no greeting eyebrow above the workspace heading.

## Elevation & Depth

The working app separates surfaces with tone and 1px borders. Shadows identify hover or overlay depth rather than lifting every card. The authentication sculpture supplies the only sustained dimensional scene, with a CSS ring fallback that never blocks the form.

### Shadow Vocabulary

- **Card hover:** `0 8px 22px #29261509`, with a 2px upward translation on fine pointers.
- **Dialog:** `0 22px 70px #10150b33` over a `#15180f80` backdrop.
- **Mobile navigation:** `15px 0 60px #13190e20` with a `#10150b66` scrim.
- **Field focus:** `0 0 0 3px var(--orange-light)`, paired with an orange border.

## Shapes

Controls have small, practical radii: fields 6px, buttons/navigation 7px and icon buttons 8px. Cards use 10px, editors 12px (9px on mobile), dialogs 14px and the auth story 17px (13px on mobile). The date card has an arched `90px 90px 12px 12px` silhouette. Circular identity marks and pill counts are supporting accents. Most edges are 1px strokes; the empty state uses a dashed border.

## Components

### Buttons

Compact, readable actions use ink fills, paper text and 0 22px padding with a 47px minimum height. Compact actions use 39px and 0 14px; auth submit uses 51px. Fine-pointer hover moves primary buttons up 1px and turns them orange. Press scales to .97. Outline buttons keep a transparent resting fill and line border. Disabled controls have .5 opacity and a disabled cursor. Icon buttons are normally 40px square, with smaller editor variants.

### Cards / Containers

Note cards use paper, a line border and 21px padding with a 218px minimum height. Orange-light plus an orange border identifies the selected note. Titles clamp to two lines and excerpts to three; compact excerpts clamp to two. The date card is an editorial accent, not an action card. Empty, loading and error states retain the same restrained palette.

### Inputs / Fields

Auth inputs have a 49px minimum height, 6px radius, transparent fill and line border. Focus changes the border and adds the pale orange halo; other keyboard controls use a 2px orange outline offset by 4px. Mobile auth fields use 16px type. Search is a bordered inline icon/input group with orange focus-within border. Errors appear as pale terracotta blocks with orange copy. The editor title wraps and saves on blur or Enter.

### Navigation

The dark sidebar combines muted labels and outline icons. Active rows use `#3d3d30` with `#f2b083` text; fine-pointer hover uses `#32382b` and `#f4ead8`. Counts sit at the right. The mobile drawer moves in 240ms with the shared ease-out curve. A menu control, close control, Escape handling and scrim support dismissal.

### Editors and tasks

Write, preview and split tabs use a neutral inset selected state. Formatting and import/copy/export remain compact icon actions. Autosave exposes unsaved, saving, saved and retry states. Task completion uses orange checkboxes, a scaleX progress fill and muted struck-through completed text. Keep the editor still during typing and task work.

### Motion and sculpture

UI responses run 120–240ms, primarily on transform, opacity, border and background. The shared ease-out is `cubic-bezier(.23,1,.32,1)`. Auth opening copy and form enter from 12px below over 600–700ms, with 80ms/140ms offsets. Dialogs fade and scale from .97 over 200ms; their backdrop fades over 180ms.

The original orange interlocking form rotates and floats gently, responds to fine-pointer movement, and offers a pause control. Rendering stops while offscreen or the tab is hidden and remains static with reduced motion. The renderer caps pixel ratio at 1.6 and targets roughly 30fps. Reduced-motion CSS removes animation, reduces transition duration to .01ms and simplifies the sculpture shadow. Loading spinners are also suppressed by this preference.

### Installable app

The PWA uses orange icons and the same responsive shell. Install guidance lives in the sidebar. Offline shell/fonts are cached; account editing and synchronization require connectivity, and connection state remains visible. Reminders are connected-app messages, not closed-app push.

## Do's and Don'ts

### Do:

- **Do** reuse CSS custom properties so light/dark themes remain coherent.
- **Do** reserve serif type for expressive hierarchy and keep working controls in DM Sans.
- **Do** preserve wrapped, autosized titles, visible focus and responsive drawer behavior.
- **Do** keep decoration independent of authentication and respect pause/reduced-motion states.

### Don't:

- **Don't** add continuous motion to writing or task surfaces.
- **Don't** replace the warm palette with unrelated accent families.
- **Don't** introduce invented reviews, figures or ranking claims.
- **Don't** document or expose private login credentials as interface or design content.

## Approved palette and compact workspace update

User approved warm cream with deep teal on 2026-11-08, superseding the earlier orange palette. Existing `orange` CSS token names are retained for compatibility but resolve to teal. Sculpture and PWA icons use teal too. The introduction is compact; its small square calendar retains date and live India time. Sidebar navigation scrolls independently while Install app and Sign out remain pinned within the viewport.
`nUser requested a small orange gradient accent: warm peach-to-orange on the sidebar create button, and a subtle warm-paper gradient on the calendar. Teal remains the primary working accent. Dark mode uses a muted warm calendar tint.

Orange gradient creation buttons also apply to collection toolbars across Notes and Tasks. Card opening arrows use warm orange emphasis; card timestamps show date and India time.

## Dashboard and groups

The reference dashboard informs the overview of real task totals, completion, pending work, recent notes and reminder dates. Use the existing cream, teal and warm orange palette, without demo metrics. Groups are shared across notes and task lists, scoped to the authenticated user and persisted with the user record. Personal, Work and Others are defaults; old ungrouped items resolve to Others. Sidebar groups and collection filters share the selection; editors expose Move to group. Dashboard panels stack on small screens.

The dashboard follows the supplied reference composition: four live summary cards with seven-day creation charts; My Tasks tabs; recent notes with shared group chips and grid/list toggle; a right rail with full month calendar, selected-day agenda and live IST clock, persistent Pomodoro/break timer with configurable durations, and working creation/reminder/file upload actions. Use teal, cream and orange rather than the reference purple/blue accents. All counts and chart values derive from stored data.

## Reference collection surfaces

The user supplied new Notes, Tasks and Reminders screenshots as layout authority. Preserve the cream, deep teal and warm orange palette. Notes use four compact quick actions, a three-column card grid, group/layout controls and a task/group rail. Tasks use a desk-image banner, summary cards, date/group/priority/status filters, four persistent Kanban states and a calendar/progress rail. Reminders use a matching desk banner, active/completed views, dated reminder rows, recurrence/email settings and a quick-add form. Desktop rails stack on mobile; task cards expose status selects as a keyboard and touch alternative to drag-and-drop. Existing note/task-list editors remain available.

Two original hero images were made with the built-in image generation tool and optimized into static/images/tasks-banner.webp and static/images/reminders-banner.webp. Prompts and provenance are recorded in .impeccable/reference-artwork.md.

## Explicit save and contextual reminders
Note and task-list editors expose a warm Save & back action that waits for title and content/task writes before returning to the collection. Failures retain the editor and draft. Reminder prompts appear below written content/tasks and open the date/time dialog. Native select popup options explicitly use the current theme colors; dark mode uses a dark color-scheme and light option text.
