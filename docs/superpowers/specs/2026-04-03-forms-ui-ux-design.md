# Forms Feature — Production-Grade UI/UX Design Spec

**Date:** 2026-04-03
**Project:** BrainScale CRM
**Status:** Draft — Awaiting Approval
**Scope:** Complete UI/UX specification for forms v1 (no quiz mode)
**Companion Spec:** `2026-04-03-forms-feature-integration-design.md` (architecture/integration)

---

## 1. Executive Summary

Build a production-grade, Google Forms-quality forms system for BrainScale CRM. V1 delivers: a hybrid form builder (simple baseline + optional sections/styling), all 15 field types, full branding customization, public form sharing, full analytics with charts and CSV/Excel export, role-based creation, and optional CRM linking (batch/group/module).

**Quiz mode is deferred to v2.**

### Success Criteria

- Form creation takes <3 minutes for a basic form
- Shared forms look professional on any device
- Analytics are easy to read and export
- High performance: forms load fast, handle 10k+ responses smoothly
- Excellent mobile experience for both form filling and analytics

---

## 2. User Roles & Access

### Role-Based Form Creation

Forms use the existing `CustomRole.permissions` system with resource `forms`:

| Permission | Description |
|-----------|-------------|
| `forms:create` | Create new forms |
| `forms:read` | View forms and responses |
| `forms:update` | Edit forms and settings |
| `forms:delete` | Delete/archive forms |
| `forms:publish` | Publish/unpublish forms |
| `forms:export` | Export responses (CSV/Excel) |
| `forms:manage` | Wildcard — grants all above |

**ADMIN** bypasses all checks. **MEMBER** gets `forms:read` by default. "Form creator" is any role with `forms:create` + `forms:update` + `forms:publish`.

### User Personas

1. **Form Creator** — workspace member who builds and manages forms
2. **Form Viewer** — workspace member who views forms and responses (read-only)
3. **Respondent** — external or internal user who fills out a published form (no auth required for public forms)

---

## 3. Information Architecture

### Navigation

Forms entry point in AppSidebar (between "Imports/Exports" and "Members & Roles"):

```
Dashboard
Students
Follow-ups
Call Lists
Imports / Exports
Forms              ← NEW
Members & Roles
Settings
```

**Icon:** `FileText` from lucide-react

### URL Structure

| Route | Purpose |
|-------|---------|
| `/app/forms` | Forms list (management dashboard) |
| `/app/forms/create` | Create new form |
| `/app/forms/[id]/edit` | Form builder/editor |
| `/app/forms/[id]/responses` | Response management |
| `/app/forms/[id]/analytics` | Analytics dashboard |
| `/app/forms/[id]/settings` | Form settings |
| `/forms/[slug]` | Public form (no auth, outside app layout) |

---

## 4. Forms List Page (`/app/forms`)

### Layout

```
┌──────────────────────────────────────────────────┐
│ Header: "Forms" + description                    │
│ [+ Create Form]                                  │
├──────────────────────────────────────────────────┤
│ KPI Cards Row:                                   │
│ [Total Forms] [Published] [Drafts] [Total Resp.] │
├──────────────────────────────────────────────────┤
│ Filter Bar:                                      │
│ [Search...] [Status ▾] [Type ▾] [Linked To ▾]   │
├──────────────────────────────────────────────────┤
│ Forms Table:                                     │
│ Title | Status | Type | Responses | Linked To |  │
│       | badge  |      | count     | B/G/M     |  │
│ ...rows...                                       │
│ Actions: Edit | View | Share | Duplicate | Delete│
├──────────────────────────────────────────────────┤
│ Pagination: Showing 1-10 of 42  [< 1 2 3 4 >]   │
└──────────────────────────────────────────────────┘
```

### KPI Cards

| Card | Value | Icon |
|------|-------|------|
| Total Forms | count of all forms | `FileText` |
| Published | count where status=published | `CheckCircle2` |
| Drafts | count where status=draft | `FileEdit` |
| Total Responses | sum of all responseCount | `MessageSquare` |

### Table Columns

| Column | Content | Sortable |
|--------|---------|----------|
| Title | Form title (link to edit) | Yes |
| Status | Badge: Draft (gray), Published (green), Archived (amber) | Yes |
| Type | General, Survey, Attendance | Yes |
| Responses | Response count | Yes |
| Linked To | Batch/Group/Module name or "General" | Yes |
| Created | Relative date (e.g., "2d ago") | Yes |
| Actions | Overflow menu | No |

### Row Actions (overflow menu)

- **Edit** — navigate to builder
- **View Responses** — navigate to responses page
- **Analytics** — navigate to analytics page
- **Share Link** — copy public URL to clipboard (toast confirmation)
- **Duplicate** — create copy with "(Copy)" suffix, status=draft
- **Publish / Unpublish** — toggle status (confirmation dialog for unpublish)
- **Archive** — move to archived (confirmation dialog)
- **Delete** — permanent delete (destructive confirmation dialog with form title confirmation)

### Filters

- **Search:** Debounced (300ms), searches title and description
- **Status:** All, Draft, Published, Archived
- **Type:** All, General, Survey, Attendance
- **Linked To:** All, General (unlinked), specific batch/group/module names

### Empty State

When no forms exist:
- Illustration or icon (FileText, large, muted)
- "No forms yet"
- "Create your first form to start collecting responses"
- [+ Create Form] button

### Pagination

- Server-side, 10 items per page (configurable: 10/25/50)
- "Showing X-Y of Z forms"
- Page number buttons with prev/next

---

## 5. Form Builder (`/app/forms/[id]/edit`)

### Architecture: Hybrid Progressive

The builder uses a **3-panel layout** on desktop and **tabbed layout** on mobile.

### Desktop Layout (≥768px)

```
┌─────────────────────────────────────────────────────┐
│ Builder Toolbar                                      │
│ [← Back] Form Title (editable) [Preview] [Save] [Publish] │
├────────┬──────────────────────────┬─────────────────┤
│ Field  │ Canvas                   │ Settings        │
│ Palette│                          │ Panel           │
│        │ ┌──────────────────────┐ │                 │
│ Basic  │ │ Section 1            │ │ Field Config    │
│ ──────── │ ┌──────────────────┐ │ │ OR              │
│ Text   │ │ │ Field 1          │ │ │ Section Config  │
│ Email  │ │ │ [Label] [Type]   │ │ │ OR              │
│ Phone  │ │ └──────────────────┘ │ │ Form Settings   │
│ Number │ │ ┌──────────────────┐ │ │                 │
│ Textarea│ │ │ Field 2          │ │ │ ┌─────────────┐│
│        │ │ └──────────────────┘ │ │ │ Label        ││
│ Choice │ │ [+ Add Field]        │ │ │ Placeholder  ││
│ ──────── │                      │ │ │ Help Text    ││
│ Dropdown│ └──────────────────────┘ │ │ Required [x] ││
│ Radio  │                          │ │ Validation   ││
│ Checkbox│ ┌──────────────────────┐ │ │              ││
│        │ │ Section 2            │ │ └─────────────┘│
│ Date   │ │ ...                  │ │                 │
│ ──────── │ └──────────────────────┘ │                 │
│ Date   │                          │                 │
│ Time   │ [+ Add Section]          │                 │
│        │                          │                 │
│ Advanced│                          │                 │
│ ──────── │                          │                 │
│ File   │                          │                 │
│ Signature│                         │                 │
│ Rating │                          │                 │
│ Matrix │                          │                 │
│ Ranking│                          │                 │
│        │                          │                 │
│ Layout │                          │                 │
│ ──────── │                          │                 │
│ Section│                          │                 │
│ Break  │                          │                 │
├────────┴──────────────────────────┴─────────────────┤
│ Footer: Auto-saved 2s ago                            │
└─────────────────────────────────────────────────────┘
```

### Panel Widths
- **Field Palette:** 220px fixed, collapsible
- **Canvas:** flex-1 (takes remaining space)
- **Settings Panel:** 320px fixed, collapsible

### Mobile Layout (<768px)

3 tabs at the top: **Fields** | **Canvas** | **Settings**

- **Fields tab:** Full-width field palette (grid of field type buttons)
- **Canvas tab:** Full-width canvas with inline editing
- **Settings tab:** Full-width settings panel

### Builder Toolbar

```
[← Back to Forms]  [Form Title - editable inline]  [Preview] [Save Draft] [Publish]
```

- **Back:** Navigate to `/app/forms` (warn if unsaved changes)
- **Title:** Inline editable, click to edit, blur to save
- **Preview:** Opens form in new tab/modal as respondent would see it
- **Save Draft:** Manual save (auto-save also runs on field changes with 2s debounce)
- **Publish:** Publish form (or show "Published" status with unpublish option)

### Auto-Save Behavior

- Debounced: 2 seconds after last change
- Visual indicator in footer: "Saving..." → "All changes saved" → "Auto-saved 2s ago"
- Manual save always available
- On navigation away with unsaved changes: confirmation dialog

---

## 6. Field Palette

### Field Categories

**Basic (5):**
| Field | Icon | Description |
|-------|------|-------------|
| Short Text | `Type` | Single-line text input |
| Long Text | `AlignLeft` | Multi-line textarea |
| Email | `Mail` | Email input with format validation |
| Phone | `Phone` | Phone number input |
| Number | `Hash` | Numeric input with min/max |

**Choice (3):**
| Field | Icon | Description |
|-------|------|-------------|
| Dropdown | `ChevronDown` | Single-select dropdown |
| Radio | `Circle` | Single-select radio buttons |
| Checkbox | `CheckSquare` | Multi-select checkboxes |

**Date & Time (2):**
| Field | Icon | Description |
|-------|------|-------------|
| Date | `Calendar` | Date picker |
| Time | `Clock` | Time picker |

**Advanced (5):**
| Field | Icon | Description |
|-------|------|-------------|
| File Upload | `Upload` | File attachment (configurable types/size) |
| Signature | `PenTool` | Draw signature pad |
| Rating | `Star` | Star rating (1-5 or 1-10) |
| Matrix | `Grid3X3` | Grid of questions × options |
| Ranking | `ArrowUpDown` | Drag-to-reorder items |

**Layout (1):**
| Field | Icon | Description |
|-------|------|-------------|
| Section Break | `Minus` | Visual divider with optional title/description |

### Adding Fields

- **Click** a field type in the palette → appends to end of current section
- **Drag** a field type from palette → drop into specific position in canvas
- Drag-and-drop powered by `@dnd-kit/core` + `@dnd-kit/sortable`

---

## 7. Canvas (Center Panel)

### Structure

Forms are structured as an array of **sections**. Each section contains an array of **fields**.

```typescript
interface FormStructure {
  sections: Section[];
}

interface Section {
  id: string;
  title?: string;
  description?: string;
  style?: SectionStyle;
  fields: FormField[];
}

interface SectionStyle {
  backgroundColor?: string;
  padding?: 'compact' | 'normal' | 'spacious';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg';
  showBorder?: boolean;
}
```

**Default:** Every form starts with one untitled section. Users can add more sections.

### Field Card (in Canvas)

Each field renders as an editable card:

```
┌─ ⠿ ─────────────────────────────────────────┐
│ ⠿ [drag handle]                    [⋮ menu] │
│                                               │
│ Label (click to edit inline)         * Req    │
│ ┌───────────────────────────────────────────┐ │
│ │ Placeholder preview (disabled input)      │ │
│ └───────────────────────────────────────────┘ │
│ Help text (click to edit)                     │
└───────────────────────────────────────────────┘
```

### Field Card States

- **Default:** Light border, white background
- **Hover:** Slightly elevated shadow, drag handle visible
- **Selected:** Blue/primary left border, settings panel shows this field's config
- **Dragging:** Elevated shadow, reduced opacity at original position, placeholder shown at drop target

### Field Card Actions (overflow menu `⋮`)

- **Duplicate** — copy field below current position
- **Move Up / Move Down** — reorder without drag
- **Required Toggle** — quick toggle
- **Delete** — remove with undo toast (3s window)

### Section Card

```
┌──────────────────────────────────────────────┐
│ ⠿ Section Title (editable)          [⋮ menu]│
│ Section description (editable)               │
│ ┌──────────────────────────────────────────┐ │
│ │ Field 1                                  │ │
│ │ Field 2                                  │ │
│ │ ...                                      │ │
│ │ [+ Add Field]                            │ │
│ └──────────────────────────────────────────┘ │
└──────────────────────────────────────────────┘
```

### Drag-and-Drop Behavior

- **Reorder fields within a section:** Drag field card to new position
- **Move field between sections:** Drag field to another section's drop zone
- **Reorder sections:** Drag section by its header
- **Visual feedback:** Drop target highlighted with dashed border + primary color indicator

---

## 8. Settings Panel (Right Panel)

### Tabs

The settings panel has 3 tabs:

#### Tab 1: Field Config (shown when a field is selected)

| Setting | Applies To | Control |
|---------|-----------|---------|
| Label | All | Text input |
| Placeholder | Text, Email, Phone, Number | Text input |
| Help Text | All | Text input |
| Required | All | Switch toggle |
| **Validation** | | |
| Min Length | Short/Long Text | Number input |
| Max Length | Short/Long Text | Number input |
| Min Value | Number | Number input |
| Max Value | Number | Number input |
| Pattern (regex) | Short Text, Email, Phone | Text input |
| Custom Error Message | All with validation | Text input |
| **Choice Options** | | |
| Options List | Dropdown, Radio, Checkbox | Editable list with add/remove/reorder |
| Allow "Other" | Dropdown, Radio, Checkbox | Switch toggle |
| **File Upload** | | |
| Accepted Types | File Upload | Multi-select (Images, Documents, Spreadsheets, All) |
| Max File Size (MB) | File Upload | Number input (default: 10MB) |
| Max Files | File Upload | Number input (default: 1) |
| **Rating** | | |
| Max Stars | Rating | Dropdown (5 or 10) |
| Labels | Rating | Start/End labels (e.g., "Poor" / "Excellent") |
| **Matrix** | | |
| Row Labels | Matrix | Editable list |
| Column Labels | Matrix | Editable list |
| Allow Multiple per Row | Matrix | Switch toggle |
| **Ranking** | | |
| Items | Ranking | Editable list with add/remove |

#### Tab 2: Section Config (shown when a section header is clicked)

| Setting | Control |
|---------|---------|
| Section Title | Text input |
| Section Description | Textarea |
| Background Color | Color picker (preset palette + custom hex) |
| Padding | Segmented control: Compact / Normal / Spacious |
| Border Radius | Segmented control: None / SM / MD / LG |
| Show Border | Switch toggle |

#### Tab 3: Form Settings (always accessible via tab)

**General:**
| Setting | Control |
|---------|---------|
| Form Title | Text input |
| Description | Textarea (markdown supported) |
| Form Type | Dropdown: General, Survey, Attendance |

**CRM Linking (Optional):**
| Setting | Control |
|---------|---------|
| Link to Batch | Dropdown (workspace batches, or "None") |
| Link to Group | Dropdown (workspace groups, or "None") |
| Link to Module | Dropdown (workspace modules, or "None") |

**Submission Settings:**
| Setting | Control | Default |
|---------|---------|---------|
| Allow Multiple Submissions | Switch | On |
| Require Identity | Switch | Off |
| — Require Name | Switch (nested, shown if identity on) | On |
| — Require Email | Switch (nested) | On |
| — Require Phone | Switch (nested) | Off |
| Submission Start Date | Date picker | None |
| Submission End Date | Date picker | None |

**Display Settings:**
| Setting | Control | Default |
|---------|---------|---------|
| Display Mode | Segmented: All at Once / Section by Section | All at Once |
| Show Progress Bar | Switch | On (for section-by-section) |
| Confirmation Message | Textarea | "Thank you for your response!" |
| Redirect URL (after submit) | Text input | None |

**Branding:**
| Setting | Control | Default |
|---------|---------|---------|
| Header Image | File upload (image only, max 2MB) | None |
| Logo | File upload (image only, max 1MB) | Workspace logo |
| Primary Color | Color picker | Workspace primary color |
| Background Color | Color picker | White |
| Font Family | Dropdown (preset list) | System default (Geist) |
| Custom CSS Class | Text input | None |

**Font Preset List:**
- Geist (default)
- Inter
- Plus Jakarta Sans
- DM Sans
- Nunito
- Lora (serif)
- Merriweather (serif)
- JetBrains Mono (monospace)

**Security:**
| Setting | Control | Default |
|---------|---------|---------|
| Enable CAPTCHA | Switch | Off |
| Password Protection | Switch | Off |
| — Password | Text input (shown if on) | — |

---

## 9. Public Form (`/forms/[slug]`)

### Layout

The public form renders outside the app layout (no sidebar, no topbar). Clean, distraction-free.

```
┌─────────────────────────────────────────────┐
│                                             │
│         [Logo]                              │
│         [Header Image]                      │
│                                             │
│         Form Title                          │
│         Form Description                    │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Identity Gate (if required)           │  │
│  │ [Name] [Email] [Phone]               │  │
│  │ [Continue →]                          │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Section 1: Title                      │  │
│  │                                       │  │
│  │ Field 1 (label, input, help text)     │  │
│  │ Field 2                               │  │
│  │ ...                                   │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  ┌───────────────────────────────────────┐  │
│  │ Section 2: Title                      │  │
│  │ ...                                   │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  [Submit]                                   │
│                                             │
│  ─────────────────────────────────────────  │
│  Powered by BrainScale CRM                  │
│                                             │
└─────────────────────────────────────────────┘
```

### Display Modes

**All at Once (default):**
- All sections and fields visible on one scrollable page
- Submit button at bottom
- Progress bar (optional) shows % of required fields completed

**Section by Section:**
- One section visible at a time
- Navigation: [← Previous] [Next →] or [Submit] on last section
- Progress bar shows current section / total sections
- Smooth transition between sections (slide animation, 200ms)
- Keyboard: Enter advances to next section (if all required fields filled)

### Identity Gate

When "Require Identity" is enabled, show identity form BEFORE the actual form:

```
┌───────────────────────────────────────┐
│ Before you begin...                   │
│                                       │
│ Name *     [________________]         │
│ Email *    [________________]         │
│ Phone      [________________]         │
│                                       │
│ [Continue →]                          │
└───────────────────────────────────────┘
```

- Fields shown based on settings (requireName, requireEmail, requirePhone)
- Validation on blur + on submit
- After identity collected, transition to form (identity stored, not re-asked)

### Field Rendering (Public Form)

Each field type renders as a native-feeling, mobile-optimized input:

| Field Type | Rendered As |
|-----------|-------------|
| Short Text | `<input type="text">` |
| Long Text | `<textarea>` with auto-resize |
| Email | `<input type="email">` with format validation |
| Phone | `<input type="tel">` |
| Number | `<input type="number">` with min/max |
| Dropdown | Radix Select (styled, searchable for >7 options) |
| Radio | Vertical radio button group |
| Checkbox | Vertical checkbox group |
| Date | `react-day-picker` calendar |
| Time | `<input type="time">` |
| File Upload | Dropzone with drag-and-drop + click to browse |
| Signature | Canvas drawing pad with clear/undo buttons |
| Rating | Interactive star/number rating (tap/click) |
| Matrix | Responsive grid (horizontal scroll on mobile if needed) |
| Ranking | Sortable list (drag-to-reorder via @dnd-kit) |

### Validation

- **On blur:** Validate the field when user leaves it; show error below field
- **On submit:** Validate all required fields; scroll to first error; focus first invalid field
- **Error display:** Red text below the field with specific message (not generic "Required")
- **Required indicator:** Red asterisk `*` after label
- **aria-live:** Error messages use `aria-live="polite"` for screen readers

### Error Messages

| Validation | Message |
|-----------|---------|
| Required (empty) | "This field is required" |
| Email format | "Please enter a valid email address" |
| Phone format | "Please enter a valid phone number" |
| Min length | "Must be at least {n} characters" |
| Max length | "Must be no more than {n} characters" |
| Min value | "Must be at least {n}" |
| Max value | "Must be no more than {n}" |
| File type | "Accepted file types: {types}" |
| File size | "File must be smaller than {n}MB" |
| Pattern | Custom error message or "Invalid format" |

### Submission Flow

1. User clicks [Submit]
2. Client-side validation runs
3. If errors: scroll to first error, show all error messages
4. If valid: button shows spinner + "Submitting..."
5. POST to `/api/v1/forms/:slug/submit`
6. Server validates: availability, identity dedup, required fields
7. On success: show confirmation screen
8. On error: show error toast with retry option

### Confirmation Screen

```
┌───────────────────────────────────────┐
│                                       │
│         ✓ (green checkmark icon)      │
│                                       │
│   Your response has been recorded!    │
│                                       │
│   (Custom confirmation message here)  │
│                                       │
│   [Submit another response]           │
│   (shown only if allowMultiple=true)  │
│                                       │
└───────────────────────────────────────┘
```

### Form Unavailable States

| State | Message |
|-------|---------|
| Not published | "This form is not currently accepting responses" |
| Before start date | "This form will open on {date}" |
| After end date | "This form closed on {date}" |
| Password required | Show password input with [Enter] button |
| Already submitted (no multiples) | "You have already submitted a response" |

### Responsive Behavior

- Max width: 640px centered (comfortable reading width)
- Padding: 16px on mobile, 24px on tablet+
- Font: 16px minimum body text (prevents iOS auto-zoom)
- Touch targets: 44px minimum height on all interactive elements
- Section spacing: 24px between sections
- Field spacing: 16px between fields within a section

---

## 10. Response Management (`/app/forms/[id]/responses`)

### Layout

```
┌──────────────────────────────────────────────────┐
│ [← Back] Form Title > Responses                  │
│                                                   │
│ KPI Row:                                          │
│ [Total: 342] [Today: 12] [Avg Time: 3m 24s]     │
│ [Completion Rate: 89%]                            │
├──────────────────────────────────────────────────┤
│ Actions Bar:                                      │
│ [Search...] [Date Range ▾] [Export ▾]            │
│ [□ Select All]                                    │
├──────────────────────────────────────────────────┤
│ Response Table (virtualized):                     │
│ □ | # | Respondent | Submitted | Duration | ⋮    │
│ □ | 1 | john@...   | 2m ago   | 3:24     | View │
│ □ | 2 | jane@...   | 5m ago   | 2:11     | View │
│ ...                                               │
├──────────────────────────────────────────────────┤
│ Pagination or Infinite Scroll                     │
└──────────────────────────────────────────────────┘
```

### Response Table Columns

| Column | Content |
|--------|---------|
| Checkbox | Bulk selection |
| # | Sequential number |
| Respondent | Name/email or "Anonymous" |
| Submitted | Relative timestamp |
| Duration | Time spent (mm:ss) |
| Key field answers | First 2-3 fields as preview columns |
| Actions | View detail, Delete |

### Virtualization

- Table uses `@tanstack/react-virtual` for rows >50
- Render only visible rows + 10 buffer
- Smooth scrolling performance even at 10k+ responses

### Response Detail View

Clicking a response row opens a **slide-over panel** (right side, 480px wide):

```
┌─────────────────────────────────┐
│ Response #42              [✕]   │
│ ───────────────────────────────  │
│ Submitted: Apr 3, 2026 2:34 PM │
│ Duration: 3 minutes 24 seconds  │
│ Respondent: john@example.com    │
│ ───────────────────────────────  │
│                                  │
│ Q1: What is your name?          │
│ A: John Doe                     │
│                                  │
│ Q2: Select your program         │
│ A: Computer Science             │
│                                  │
│ Q3: Rate your experience        │
│ A: ★★★★☆ (4/5)                 │
│                                  │
│ Q4: Upload your document        │
│ A: resume.pdf (Download)        │
│                                  │
│ ...                              │
│                                  │
│ [Delete Response]                │
└─────────────────────────────────┘
```

### Export

Export dropdown with options:
- **CSV** — all fields, all responses matching current filters
- **Excel (XLSX)** — formatted with headers and data types
- Column selection dialog before export (choose which fields to include)
- Export respects current search/date filters
- Large exports (>5000 rows): show progress indicator, async generation

### Bulk Actions

When responses are selected:
- **Delete Selected** — destructive confirmation dialog
- **Export Selected** — export only selected responses

---

## 11. Analytics Dashboard (`/app/forms/[id]/analytics`)

### Layout

```
┌──────────────────────────────────────────────────┐
│ [← Back] Form Title > Analytics                   │
│                                                   │
│ Date Range: [Last 7 days ▾] [Custom]              │
│ CRM Filter: [All ▾] (Batch/Group/Module filter)   │
├──────────────────────────────────────────────────┤
│ KPI Cards Row:                                    │
│ [Responses: 342] [Completion: 89%] [Avg Time: 3m]│
│ [Responses Today: 12]                             │
├──────────────────────────────────────────────────┤
│ Response Trend Chart (line chart)                 │
│ X: date, Y: response count                       │
│ Tooltip on hover/tap showing exact count + date   │
├──────────────────────────────────────────────────┤
│ Per-Field Breakdown                               │
│                                                   │
│ ┌─────────────────┐ ┌─────────────────┐          │
│ │ Q1: Program     │ │ Q2: Experience  │          │
│ │ [Bar Chart]     │ │ [Bar Chart]     │          │
│ │ CS: 45%  ████▌  │ │ 5★: 30% ███    │          │
│ │ EE: 30%  ███    │ │ 4★: 45% ████▌  │          │
│ │ ME: 25%  ██▌    │ │ 3★: 25% ██▌    │          │
│ └─────────────────┘ └─────────────────┘          │
│                                                   │
│ ┌─────────────────┐ ┌─────────────────┐          │
│ │ Q3: Name        │ │ Q4: Comments    │          │
│ │ [Text Summary]  │ │ [Text Summary]  │          │
│ │ 342 responses   │ │ 298 responses   │          │
│ │ Avg length: 12  │ │ Avg length: 45  │          │
│ │ Recent: "John", │ │ Recent: "Great" │          │
│ │ "Jane", "Bob"   │ │ "Good", "Okay"  │          │
│ └─────────────────┘ └─────────────────┘          │
│                                                   │
├──────────────────────────────────────────────────┤
│ [View All Responses] [Export CSV] [Export Excel]  │
└──────────────────────────────────────────────────┘
```

### KPI Cards

| Metric | Calculation |
|--------|-------------|
| Total Responses | Count of FormResponse for this form |
| Completion Rate | Responses with all required fields answered / total starts |
| Avg Completion Time | Average of `durationMs` |
| Responses Today | Count where submittedAt >= today start |

### Response Trend Chart

- **Type:** Line chart (recharts `LineChart`)
- **X axis:** Date (grouped by day/week/month based on range)
- **Y axis:** Response count
- **Tooltip:** Date + exact count on hover
- **Responsive:** Simplified on mobile (fewer tick labels)
- **Date ranges:** Last 7 days, Last 30 days, Last 90 days, All time, Custom

### Per-Field Analytics Cards

Each form field gets an analytics card. Card type depends on field type:

| Field Type | Card Content |
|-----------|-------------|
| Dropdown, Radio | Horizontal bar chart — option label + count + percentage |
| Checkbox | Horizontal bar chart — each option independently (can total >100%) |
| Rating | Bar chart by rating value (1-5 or 1-10) + average rating displayed |
| Number | Stats: min, max, average, median |
| Short/Long Text | Response count + average length + 5 most recent samples |
| Date | Range: earliest to latest response date |
| File Upload | Count of uploads + total size |
| Matrix | Heat map table (rows × columns, colored by frequency) |
| Ranking | Average rank per item (sorted by avg rank) |

### CRM Filter

When form is linked to batch/group/module, analytics can be filtered:
- Filter by Batch (if linked)
- Filter by Group (if linked)
- Filter by Module (if linked)
- "All" shows unfiltered data

### Chart Accessibility

- All charts have `aria-label` describing the data insight
- Screen reader summary: "Program field: Computer Science leads with 45% of 342 responses"
- Color is not the only differentiator (labels + values shown)
- Legends visible by default
- Keyboard-navigable tooltip data

---

## 12. Form Settings Page (`/app/forms/[id]/settings`)

A standalone settings page accessible from form detail views. Contains the same settings as the builder's "Form Settings" tab, plus additional operational controls:

### Additional Settings (not in builder)

**Sharing:**
- Public URL display with copy button
- QR code generation for the form link
- Embed code (iframe snippet) for external websites

**Danger Zone:**
- Archive form (with confirmation)
- Delete form permanently (with title-confirmation dialog)
- Transfer ownership to another workspace member

---

## 13. Component Architecture

### New Components to Build

```
frontend/web/src/components/forms/
├── FormsList.tsx              # Forms table with filters/pagination
├── FormsKPICards.tsx           # KPI stat cards row
├── FormStatusBadge.tsx         # Draft/Published/Archived badge
│
├── builder/
│   ├── FormBuilderLayout.tsx   # 3-panel layout container
│   ├── FormBuilderToolbar.tsx  # Top toolbar (title, save, publish)
│   ├── FieldPalette.tsx        # Left panel - field type selector
│   ├── BuilderCanvas.tsx       # Center panel - sections + fields
│   ├── SectionCard.tsx         # Section container in canvas
│   ├── FieldCard.tsx           # Field card in canvas (draggable)
│   ├── FieldInlineEditor.tsx   # Inline label/placeholder editing
│   ├── SettingsPanel.tsx       # Right panel - tabbed config
│   ├── FieldConfigTab.tsx      # Field-specific settings
│   ├── SectionConfigTab.tsx    # Section styling settings
│   ├── FormSettingsTab.tsx     # Form-wide settings
│   └── BrandingConfig.tsx      # Branding/theme settings
│
├── public/
│   ├── PublicFormShell.tsx      # Stage orchestrator (identity→form→confirm)
│   ├── IdentityGate.tsx        # Pre-form identity collection
│   ├── FormRenderer.tsx        # Renders form fields (all-at-once or paginated)
│   ├── SectionRenderer.tsx     # Renders a section with its fields
│   ├── ConfirmationScreen.tsx  # Post-submit success screen
│   ├── FormUnavailable.tsx     # Closed/expired/password states
│   └── fields/
│       ├── TextField.tsx       # Short/Long text
│       ├── EmailField.tsx      # Email input
│       ├── PhoneField.tsx      # Phone input
│       ├── NumberField.tsx     # Number input
│       ├── DropdownField.tsx   # Radix Select
│       ├── RadioField.tsx      # Radio group
│       ├── CheckboxField.tsx   # Checkbox group
│       ├── DateField.tsx       # Date picker
│       ├── TimeField.tsx       # Time input
│       ├── FileUploadField.tsx # Dropzone
│       ├── SignatureField.tsx  # Canvas pad
│       ├── RatingField.tsx     # Star rating
│       ├── MatrixField.tsx     # Grid table
│       └── RankingField.tsx    # Sortable list
│
├── responses/
│   ├── ResponsesPage.tsx       # Response management container
│   ├── ResponsesTable.tsx      # Virtualized response table
│   ├── ResponseDetail.tsx      # Slide-over response viewer
│   ├── ResponseExport.tsx      # Export dialog (CSV/Excel)
│   └── BulkActions.tsx         # Bulk delete/export toolbar
│
└── analytics/
    ├── AnalyticsPage.tsx       # Analytics dashboard container
    ├── AnalyticsKPICards.tsx    # Metrics cards row
    ├── ResponseTrendChart.tsx   # Line chart (recharts)
    ├── FieldAnalyticsCard.tsx   # Per-field breakdown card
    ├── ChoiceBarChart.tsx       # Horizontal bar for choice fields
    ├── RatingChart.tsx          # Rating distribution chart
    ├── TextSummaryCard.tsx      # Text field summary
    ├── MatrixHeatmap.tsx        # Matrix field heat map
    └── RankingSummary.tsx       # Average ranks display
```

### New Pages

```
frontend/web/src/app/(app)/app/forms/
├── page.tsx                    # Forms list
├── create/page.tsx             # Create form (redirects to edit after creation)
├── [id]/
│   ├── edit/page.tsx           # Form builder
│   ├── responses/page.tsx      # Response management
│   ├── analytics/page.tsx      # Analytics dashboard
│   └── settings/page.tsx       # Form settings

frontend/web/src/app/forms/
└── [slug]/page.tsx             # Public form (outside app layout)
```

### New Hooks

```
frontend/web/src/hooks/
├── useForms.ts                 # Already exists - enhance with filters
├── useForm.ts                  # Single form fetch by ID
├── useFormResponses.ts         # Paginated responses for a form
├── useFormAnalytics.ts         # Analytics data for a form
└── useFormBuilder.ts           # Builder state management (auto-save, dirty state)
```

### New Types

```typescript
// frontend/web/src/types/forms.types.ts — enhance existing

// Field types enum
type FieldType =
  | 'short_text' | 'long_text' | 'email' | 'phone' | 'number'
  | 'dropdown' | 'radio' | 'checkbox'
  | 'date' | 'time'
  | 'file_upload' | 'signature' | 'rating' | 'matrix' | 'ranking'
  | 'section_break';

// Core field definition
interface FormField {
  id: string;
  type: FieldType;
  label: string;
  placeholder?: string;
  helpText?: string;
  required: boolean;
  validation?: FieldValidation;
  // Type-specific
  options?: string[];          // dropdown, radio, checkbox, ranking
  allowOther?: boolean;        // dropdown, radio, checkbox
  maxRating?: 5 | 10;         // rating
  ratingLabels?: { start: string; end: string }; // rating
  matrixRows?: string[];       // matrix
  matrixColumns?: string[];    // matrix
  matrixMultiple?: boolean;    // matrix
  acceptedFileTypes?: string[];// file_upload
  maxFileSize?: number;        // file_upload (MB)
  maxFiles?: number;           // file_upload
}

interface FieldValidation {
  minLength?: number;
  maxLength?: number;
  min?: number;
  max?: number;
  pattern?: string;
  customError?: string;
}

// Section
interface FormSection {
  id: string;
  title?: string;
  description?: string;
  style?: SectionStyle;
  fields: FormField[];
}

interface SectionStyle {
  backgroundColor?: string;
  padding?: 'compact' | 'normal' | 'spacious';
  borderRadius?: 'none' | 'sm' | 'md' | 'lg';
  showBorder?: boolean;
}

// Form settings
interface FormSettings {
  isPublic: boolean;
  allowMultipleSubmissions: boolean;
  identitySchema: {
    requireIdentity: boolean;
    requireName: boolean;
    requireEmail: boolean;
    requirePhone: boolean;
  };
  startAt: string | null;       // ISO date
  endAt: string | null;         // ISO date
  displayMode: 'all' | 'section_by_section';
  showProgressBar: boolean;
  confirmationMessage: string;
  redirectUrl?: string;
  branding: FormBranding;
  security: {
    captchaEnabled: boolean;
    passwordProtected: boolean;
    password?: string;
  };
}

interface FormBranding {
  headerImage?: string;         // URL
  logo?: string;                // URL
  primaryColor: string;         // hex
  backgroundColor: string;      // hex
  fontFamily: string;           // font name
  customCssClass?: string;
}

// CRM linking (matches existing Prisma schema — stores names, not IDs)
interface FormCRMLinking {
  batchName?: string;    // maps to Form.batchName
  courseName?: string;   // maps to Form.courseName
  moduleName?: string;   // maps to Form.moduleName
}

// Full form
interface Form {
  id: string;
  workspaceId: string;
  ownerUserId: string;
  title: string;
  description?: string;
  type: 'general' | 'survey' | 'attendance';
  status: 'draft' | 'published' | 'archived';
  slug: string;
  sections: FormSection[];
  settings: FormSettings;
  linking?: FormCRMLinking;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

// Analytics
interface FormAnalytics {
  totalResponses: number;
  completionRate: number;
  avgDurationMs: number;
  responsesToday: number;
  trend: { date: string; count: number }[];
  byField: Record<string, FieldAnalytics>;
}

interface FieldAnalytics {
  fieldId: string;
  fieldType: FieldType;
  fieldLabel: string;
  responseCount: number;
  // Choice fields
  distribution?: { label: string; count: number; percentage: number }[];
  // Number/Rating fields
  stats?: { min: number; max: number; avg: number; median: number };
  // Text fields
  avgLength?: number;
  samples?: string[];
  // Matrix fields
  heatmap?: { row: string; col: string; count: number }[];
  // Ranking fields
  avgRanks?: { item: string; avgRank: number }[];
}
```

---

## 14. Backend Enhancements

### API Endpoints (additions to existing module)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /forms/:id/analytics` | GET | Analytics aggregation with date range + CRM filters |
| `POST /forms/:id/upload` | POST | Upload file for header image, logo, or file field responses |
| `GET /forms/:id/export` | GET | Export responses as CSV/XLSX with column selection |
| `GET /forms/:id/responses/:responseId` | GET | Single response detail |
| `DELETE /forms/:id/responses/:responseId` | DELETE | Delete single response |
| `DELETE /forms/:id/responses` | DELETE | Bulk delete responses (body: { ids: [] }) |

### Schema Migration

The `Form.fields` JSON field currently stores a flat array. For v1, migrate to the sections-based structure:

```json
// OLD (flat fields array)
{ "fields": [{ "id": "f1", "type": "short_text", ... }] }

// NEW (sections with fields)
{
  "sections": [
    {
      "id": "s1",
      "title": "",
      "fields": [{ "id": "f1", "type": "short_text", ... }]
    }
  ]
}
```

**Migration strategy:** Wrap existing flat arrays in a single default section. Backward-compatible read: if `sections` exists use it, else wrap `fields` in a default section.

### File Upload Storage — Vercel Blob

**Provider:** `@vercel/blob` (serverless-native, no S3 config needed)

**Install:** `npm install @vercel/blob` (backend)

**How it works:**
1. Client uploads file to backend endpoint
2. Backend validates (type, size, MIME check)
3. Backend calls `put()` from `@vercel/blob` → returns public URL
4. URL stored in form settings (header image, logo) or response answers (file field)

**Endpoints:**
- `POST /forms/:id/upload` — upload header image or logo (auth required)
- `POST /forms/:slug/upload-response` — upload file field attachment (public, rate-limited)
- `DELETE /forms/blob/:url` — delete blob (auth required, cleanup)

**Constraints:**
- Header image: max 2MB, image types only (jpeg, png, webp, gif)
- Logo: max 1MB, image types only
- File field uploads: configurable per field (default 10MB, max 50MB)
- Signature: converted to PNG on client, uploaded as image (typically <100KB)

**Vercel Blob limits (Pro plan):**
- 500MB storage included, $0.15/GB after
- 1GB bandwidth included
- Max single file: 500MB
- No cold start, instant URLs

**Environment variable:** `BLOB_READ_WRITE_TOKEN` (from Vercel dashboard)

**Cleanup strategy:** When a form is deleted, queue blob deletions for all associated files (header, logo, response attachments). Use a background job or immediate cleanup.

### Security Hardening (Critical)

| Measure | Implementation |
|---------|---------------|
| Rate limiting | 10 req/min per IP on public `/submit` endpoint |
| Input sanitization | DOMPurify on all text inputs before storage |
| CAPTCHA | Optional hCaptcha/Turnstile verification on submit |
| File validation | Check MIME type + extension match, max size enforcement |
| XSS prevention | Sanitize all rendered text, no raw HTML in form fields |
| CSRF | Existing auth middleware handles; public forms use rate limit instead |

### Database Indexes

```prisma
// Add to Form model
@@index([workspaceId, status, updatedAt])

// Add to FormResponse model  
@@index([workspaceId, formId, submittedAt])
@@index([formId, submittedAt])
```

---

## 15. Performance Requirements

| Metric | Target |
|--------|--------|
| Form builder load | <1s (code split, lazy load palette icons) |
| Public form load | <800ms (critical CSS inlined, font preload) |
| Form submission | <500ms server response |
| Response table (10k rows) | Smooth 60fps scroll (virtualized) |
| Analytics load | <1s for aggregated data |
| CSV export (10k rows) | <5s generation |
| Auto-save | <300ms debounced save, no UI blocking |

### Optimization Strategies

- **Code splitting:** Builder and analytics are separate dynamic imports
- **Virtualization:** Response table uses `@tanstack/react-virtual`
- **Lazy loading:** Field palette icons loaded on demand
- **Aggregation:** Analytics uses server-side MongoDB aggregation pipeline, not client-side
- **Caching:** SWR with 2s dedup, revalidate on focus
- **Image optimization:** Header images served via Next.js Image with WebP

---

## 16. Accessibility Requirements

| Requirement | Implementation |
|-------------|---------------|
| Keyboard navigation | Full tab order in builder and public form |
| Screen reader | All fields have `aria-label`, errors use `aria-live` |
| Focus management | After submit error, focus first invalid field |
| Color contrast | 4.5:1 minimum for all text (both themes) |
| Color not only | Error states use icon + text, not just red color |
| Reduced motion | Respect `prefers-reduced-motion` for animations |
| Touch targets | 44px minimum on all interactive elements |
| Form labels | Every input has visible `<label>` (never placeholder-only) |

---

## 17. Mobile Experience

### Builder (Mobile)
- Tab-based navigation (Fields | Canvas | Settings)
- Canvas: single-column, swipe to reorder
- Full-screen field editor when tapped
- Simplified toolbar: [Save] [Publish] (collapsed menu for other actions)

### Public Form (Mobile)
- Full-width, 16px padding
- Large touch targets (44px+ height)
- Native input types (email, tel, number keyboards)
- Sticky submit button at bottom
- Section-by-section mode works naturally

### Analytics (Mobile)
- Stacked KPI cards (2-column grid)
- Charts: full-width, simplified axis labels
- Response table: card-based view instead of table on small screens
- Swipe to see response detail

---

## 18. Dependencies to Install

```bash
# Frontend — drag-and-drop for form builder
npm install @dnd-kit/core @dnd-kit/sortable @dnd-kit/utilities

# Frontend — signature pad for signature field
npm install signature_pad

# Frontend — CAPTCHA (optional, for form security)
npm install @hcaptcha/react-hcaptcha

# Backend — file storage
npm install @vercel/blob
```

**Already installed (no action needed):** `recharts`, `react-hook-form`, `zod`, `react-dropzone`, `@tanstack/react-virtual`, `framer-motion`, `xlsx`, `papaparse`, `multer`, `dompurify`.

---

## 19. Data Model Changes

### Form Model Update

The existing Prisma `Form` model already has `batchName`, `courseName`, `moduleName` as string fields for CRM linking. **No new Prisma columns needed.** We reuse these existing fields.

**CRM Linking approach:** Store names (strings) not IDs. This matches the existing schema and avoids foreign key complexity with MongoDB. The linking fields are informational/filtering metadata, not relational joins.

**JSON structure change (no schema migration):**

The `fields` JSON column currently stores a flat array. V1 wraps this in a sections-based structure:

```json
// OLD (flat fields array — backward compatible read)
{ "fields": [{ "id": "f1", "type": "short_text", ... }] }

// NEW (sections with fields)
{
  "sections": [
    {
      "id": "s1",
      "title": "",
      "fields": [{ "id": "f1", "type": "short_text", ... }]
    }
  ]
}
```

**Migration strategy:** Service layer reads both formats. If `fields` is a flat array, wrap it in a default section at read time. New forms always write sections format. No database migration script needed.

**Branding and settings:** Stored in existing `settings` JSON column. No schema change needed.

**Form type:** The Prisma schema accepts `general | survey | quiz | attendance`. V1 UI only offers General, Survey, Attendance. The `quiz` type remains valid in the DB but is hidden from the UI until v2.

---

## 20. Open Decisions (Resolved)

| Decision | Resolution |
|---------|------------|
| Quiz mode in v1? | **No** — deferred to v2 |
| Conditional logic in v1? | **No** — deferred to v2 |
| Pre-fill from URL? | **No** — deferred to v2 |
| Collaborative editing? | **No** — deferred to v2 |
| Form templates? | **No** — deferred to v2 (builder is fast enough without them) |
| Embed code? | **Yes** — simple iframe snippet in settings |
| QR code? | **Yes** — generated from public URL in settings |
| Form type options? | General, Survey, Attendance (no Quiz in v1) |
| Max field types? | 15 types + section break = 16 total |
| Drag-drop library? | `@dnd-kit` (accessible, React 19 compatible) |
| Charting library? | `recharts` (already installed, consistent with dashboard) |

---

## 21. Out of Scope (v2+)

- Quiz mode (scoring, timer, correct answers, quiz security)
- Conditional logic / field branching
- Pre-fill from URL parameters
- Collaborative editing (multi-user builder)
- Form templates gallery
- Custom domains for public forms
- Webhook integrations (Zapier, etc.)
- AI-powered form generation
- AI response analysis / chat
- Response notifications (email on new response)
- Question randomization
- A/B form testing
