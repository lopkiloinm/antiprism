# Dashboard Redesign Plan

Based on the provided mockups and the `ProjectPageClient` design system, we will fully recreate the dashboard from scratch. 

## 1. Sidebar Redesign (`components/DashboardSidebar.tsx`)
- **Structure**: Skinny vertical sidebar (`w-20` or `w-[72px]`) spanning full height.
- **Styling**: `border-r border-[var(--border)] bg-[var(--background)] flex flex-col items-center py-4`.
- **Top Area**: 
  - Antiprism Logo (Icon only, size `w-6 h-6`, without text to fit the skinny sidebar).
- **Navigation Items**:
  - Re-map existing items: "All", "Projects", "Recently Opened", "Templates", "Servers", "Trash".
  - **Item Design**: Stacked layout. Icon (`w-5 h-5`) on top, tiny text (`text-[10px]`) below.
  - **Active State**: `text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]`.
  - **Inactive State**: `text-[var(--muted)] hover:bg-[color-mix(in_srgb,var(--border)_35%,transparent)] hover:text-[var(--foreground)]`.
  - **Dimensions**: `w-14 h-14` or `w-16 h-14` rounded-xl.
- **Bottom Area**: Theme toggle and settings icons, utilizing the same stacked or single-icon design.

## 2. Main Dashboard Layout (`app/page.tsx`)
- **Structure**: Remove `DashboardHeader` entirely. The main area will be a scrollable region with a max-width container to center the content elegantly.
- **Container**: `max-w-4xl mx-auto w-full px-6 py-8 flex flex-col gap-8`.
- **Top Search Bar**:
  - Centered, large, prominent input.
  - `bg-[color-mix(in_srgb,var(--border)_12%,transparent)] border border-[var(--border)] rounded-xl py-3 pl-11 pr-4 w-full text-sm`.
  - Floating `IconSearch` inside the input on the left.
- **Filter Pills (Optional, beneath search)**:
  - Mirroring the "Source: All, Notes..." in the design. We can place sub-filters here or just keep the main navigation doing the work. Given the sidebar has the main navigation, we might skip this row to avoid redundancy, or use it for view modes (List vs Grid).

## 3. "Create / Import" Section
- **Heading**: "Start Creating"
- **Subheading**: "Click to create a new project, room, or template"
- **Action Cards Row**: 
  - 3 equal-width cards: "New Project", "New Room", "From Template".
  - `flex-1 flex items-center justify-between p-4 border border-[var(--border)] rounded-xl bg-[color-mix(in_srgb,var(--border)_8%,transparent)] hover:bg-[color-mix(in_srgb,var(--border)_20%,transparent)] cursor-pointer transition-colors`.
  - Icon + Text on the left, maybe a chevron or small icon on the right.
- **Drag & Drop / Import Zone**:
  - Wide, full-width dashed box below the action cards.
  - `border-2 border-dashed border-[var(--border)] rounded-xl p-8 flex flex-col items-center justify-center gap-2 cursor-pointer hover:bg-[color-mix(in_srgb,var(--border)_8%,transparent)] transition-colors`.
  - "Paste or drag & drop a .zip / folder here" with an upload icon.
  - Triggers the existing `handleImportZip` or `handleImportFolder`.

## 4. "Recent" / Main List Section
- **Header**: Shows current nav title (e.g., "Your Projects" or "Recently Opened").
- **View Toggle**: List / Grid toggle buttons on the right side of the header.
- **List Content**: Uses the existing `DashboardView` or `ProjectList` but rendered in-flow beneath this section, matching the styling constraints.

## 5. Components to Refactor or Remove
- `DashboardHeader.tsx`: Will be deprecated or vastly simplified, as its functionality (Search, New buttons, View mode) moves directly into `page.tsx`'s page flow.
- `ProjectList.tsx`, `SignalingServerList.tsx`: Adjust padding/margins to fit within the `max-w-4xl` container seamlessly instead of full-bleed.

## Execution Steps
1. Create `REDESIGN_PLAN.md` (Done).
2. Refactor `components/DashboardSidebar.tsx` into the new skinny, stacked-icon layout.
3. Remove `components/DashboardHeader.tsx` usage from `app/page.tsx` and build the inline top-search and action/import sections in `app/page.tsx`.
4. Render the list components below the action sections in a visually matching style.
