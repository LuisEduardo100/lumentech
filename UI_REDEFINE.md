# UI/UX Refinement Directive: "Lumentech Executive Monitor"

**Objective:** Upgrade the visual interface to an "Elite/Executive" standard without altering the underlying data logic or basic layout structure. The target aesthetic is a high-end, real-time Financial/Airport Operations Center.

**Constraint Checklist (Strict):**
1.  **NO SCROLLING:** The entire dashboard must fit perfectly within `100vh` and `100vw`. Use `grid-rows-[auto_1fr]` or flexbox to ensure perfect fit on 1080p and 4k screens.
2.  **Color Integrity:** strictly adhere to the brand palette:
    * **Orglight Section:** Primary Accent `#f75900` (Gold).
    * **Perfil Section:** Primary Accent `#000000` / `#1A1A1A` (Black/Dark Grey).
3.  **Readability:** Fonts and charts must be legible from a distance (TV context).
4.  **Typography:** STRICTLY use **TT Hoves** that you can get at public/fonts/tt_hoves/.

## 1. Design System & Styling Rules (TailwindCSS)

### A. The "Bento Grid" Layout
* Transform the existing card grid into a unified **Bento Grid** structure.
* **Gaps:** Use consistent, slightly tighter gaps (`gap-4` or `gap-6`) to maximize screen real estate.
* **Cards:** * Use a subtle "Glassmorphism" effect for backgrounds if using a gradient background, OR clean solid colors with high-end shadows.
    * **Shadows:** Replace default shadows with `shadow-[0_8px_30px_rgb(0,0,0,0.04)]` (soft, diffuse).
    * **Borders:** Add subtle borders: `border border-gray-200/50` (light mode) or `border-white/10` (if dark mode).
    * **Rounding:** Use `rounded-2xl` or `rounded-3xl` for a modern, approachable feel.

### B. Typography & Data Presentation
* **Numbers:** CRITICAL. Use `tabular-nums` (monospaced numbers) for all dynamic data. This prevents the text from "jittering" when numbers update in real-time.
* **Hierarchy:**
    * **Labels:** Uppercase, smaller, tracking-wide (e.g., `text-xs font-bold tracking-wider text-gray-400`).
    * **Values:** Large, heavy weights (e.g., `text-4xl font-extrabold text-gray-800`).
* **Font Family:** Use TT Hoves PRO

### C. Visual Feedback & "Alive" State
* **Live Indicator:** Make the "Live" badge pulse explicitly using Tailwind animation (`animate-pulse`).
* **Loading States:** Never show blank space. Use "Skeleton Loaders" (shimmer effect) that match the exact shape of the cards/charts.
* **Toasts (Notifications):**
    * Replace default alerts with a modern library like `sonner` or `react-hot-toast`.
    * Position: Bottom-Right or Top-Right (non-intrusive).
    * Style: Black background, white text, subtle gold border for success states.

## 2. Component Refinement Instructions

### The Charts (ECharts)
* Remove heavy grid lines inside charts. Keep them clean.
* **Tooltips:** Style tooltips to match the card theme (backdrop blur, rounded corners).
* **Colors:** Ensure chart colors match the section theme (Gold palette for Left, Red/Grey palette for Right).

### The Header
* Minimize height. The header is utility only.
* Add a subtle bottom blur: `backdrop-blur-md bg-white/80` (sticky).

### Adaptation for TV (Media Queries)
* Ensure that on large screens (`min-width: 1536px` - 2xl), font sizes scale up (e.g., use `text-2xl 2xl:text-4xl`). The dashboard should utilize the extra space for *clarity*, not for *more content*.

## 3. Execution Command
Refactor the frontend CSS and JSX components to apply these styles. Do not change the logic of the `SheetWatcher` or data fetching. Focus purely on the presentation layer to achieve a "Premium Real-Time Monitor" look.