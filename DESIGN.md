# DESIGN.md — Darasa

> Desktop design system and implementation guidelines for Darasa.
>
> This specification is based on the supplied desktop wireframes. Preserve the wireframes' existing information architecture, page sequence, and functionality. This document defines the visual language and interaction standards to apply consistently across those screens.

## 1. Product identity

- **Product name:** Darasa
- **Platform:** Desktop web application
- **Visual direction:** Modern, clean, practical, and approachable.
- **Brand character:** Fresh, helpful, trustworthy, and easy to use.
- **Primary visual identity:** Green, supported by restrained red and yellow accents.

Use **Darasa** consistently in the logo/wordmark, page titles, browser title, authentication screens, and interface copy. Replace all previous product-name references.

### Design goals

1. Make the primary action on each screen immediately clear.
2. Keep information dense enough for desktop workflows without making the interface feel crowded.
3. Use consistent navigation, forms, buttons, cards, tables, and status patterns.
4. Use color to communicate hierarchy and meaning, not as decoration.
5. Follow the supplied wireframes rather than inventing new screens or features.

## 2. Desktop layout

### Reference viewport

- Design reference: **1440 × 900 px**.
- Supported desktop width: **1280 px and above**.
- Minimum desktop layout width: **1024 px**.
- At widths below 1024 px, adapt the layout instead of allowing horizontal overflow.

### Layout rules

- Use a centered content container with a maximum width of approximately **1440 px**.
- Page gutters:
  - 32 px at 1280–1439 px.
  - 48 px at 1440 px and above.
- Use a 12-column grid for complex application screens.
- Standard grid gap: 24 px.
- Keep the main content flexible and align page sections consistently.
- Where the wireframe contains a sidebar, keep it visually distinct from the primary content.
- Do not force authentication pages into the same layout as application pages.
- Preserve the relative placement and hierarchy of regions shown in the wireframes.

## 3. Color palette

Green is the primary brand color. Red and yellow are supporting accents and should not compete with green.

| Token            | Hex       | Intended use                                                            |
| ---------------- | --------- | ----------------------------------------------------------------------- |
| `primary`        | `#16865B` | Primary buttons, active navigation, selected states, key brand elements |
| `primary-hover`  | `#116B48` | Hover state for primary actions                                         |
| `primary-soft`   | `#E8F4EE` | Selected backgrounds and subtle highlights                              |
| `secondary-red`  | `#E84B3C` | Promotional emphasis, discounts, warnings, destructive actions          |
| `red-soft`       | `#FCECE9` | Soft warning or promotional backgrounds                                 |
| `accent-yellow`  | `#F5BE42` | Ratings, recommendation highlights, small attention accents             |
| `yellow-soft`    | `#FFF6DF` | Soft highlight backgrounds                                              |
| `text-primary`   | `#202522` | Main text                                                               |
| `text-secondary` | `#707873` | Descriptions, helper text, metadata                                     |
| `border`         | `#E4E8E5` | Input borders, dividers, card outlines                                  |
| `surface`        | `#FFFFFF` | Cards, panels, forms                                                    |
| `background`     | `#F4F5F1` | Main application background                                             |
| `surface-dark`   | `#171A18` | Dark surfaces only where required by the design                         |

### Color proportions

Use this as a visual guideline, not a strict measurement:

- **65% neutral:** page backgrounds, surfaces, and whitespace.
- **25% green:** primary actions, active states, and brand identity.
- **10% red and yellow combined:** promotions, ratings, warnings, and small highlights.

### Color rules

- Use green for the most important action on a screen.
- Use red only when its meaning is clear, such as a discount, warning, error, or destructive action.
- Use yellow for ratings and small highlights. Avoid yellow for long text or large blocks.
- Do not use all three accent colors at equal intensity in one component.
- Never communicate status through color alone; include text or an icon.
- Check text contrast on every color combination.

## 4. Typography

Use **Plus Jakarta Sans** as the primary typeface, with a system sans-serif fallback.

| Text style      |     Size |  Weight | Usage                            |
| --------------- | -------: | ------: | -------------------------------- |
| Page heading    | 30–32 px |     700 | Main page title                  |
| Section heading | 22–24 px | 600–700 | Main content sections            |
| Subheading      | 18–20 px |     600 | Card and subsection titles       |
| Body            | 14–16 px |     400 | Main interface content           |
| Supporting text | 13–14 px |     400 | Descriptions and helper text     |
| Metadata        |    12 px | 400–500 | Timestamps and secondary details |
| Button label    |    14 px |     600 | Actions and controls             |

### Typography rules

- Use sentence case for headings, labels, and buttons.
- Keep important content at 14 px or larger wherever possible.
- Use muted text only for secondary information.
- Establish hierarchy through size and weight before adding color.
- Avoid using too many font weights on the same screen.

## 5. Spacing and dimensions

Use a 4 px base spacing scale.

| Token      | Value | Usage                              |
| ---------- | ----: | ---------------------------------- |
| `space-1`  |  4 px | Icon and label separation          |
| `space-2`  |  8 px | Compact component spacing          |
| `space-3`  | 12 px | Form field and small group spacing |
| `space-4`  | 16 px | Standard component padding         |
| `space-6`  | 24 px | Card padding and section gaps      |
| `space-8`  | 32 px | Large section gaps                 |
| `space-12` | 48 px | Page-level separation              |
| `space-16` | 64 px | Major page sections                |

### Border radius

- Compact controls: 6 px.
- Inputs and buttons: 8 px.
- Cards and panels: 12 px.
- Large feature regions: 16 px.
- Use pill shapes only for chips, tags, or controls that are explicitly designed that way.

### Borders and elevation

- Use a 1 px neutral border for inputs, cards, and panels.
- Prefer borders and spacing over heavy shadows.
- Use subtle shadows only when they help distinguish a floating or elevated element.
- Avoid glowing borders, excessive glassmorphism, and decorative gradients.

## 6. Component guidelines

### Navigation

- Keep navigation placement consistent across application screens.
- Use the primary green to identify the active section.
- Pair important icons with text labels.
- Keep account-related actions visually separate when the wireframe indicates a separate area.
- Provide a visible hover and keyboard-focus state.

### Buttons

| Variant     | Style                                              | Usage                         |
| ----------- | -------------------------------------------------- | ----------------------------- |
| Primary     | Green background, white text                       | Main action                   |
| Secondary   | White/neutral background with green border or text | Alternative action            |
| Tertiary    | Text or subtle neutral surface                     | Low-emphasis action           |
| Destructive | Red background or red text                         | Delete or irreversible action |
| Disabled    | Muted background and text                          | Unavailable action            |

Button requirements:

- Use one visually dominant primary action per major section.
- Standard height: **40–44 px**.
- Prominent action height: **44–48 px**.
- Keep horizontal padding consistent.
- Define default, hover, active, focus-visible, loading, and disabled states.
- Do not use a destructive button for ordinary navigation.

### Inputs and forms

- Standard input height: **42–44 px**.
- Put persistent labels above fields; placeholders must not be the only labels.
- Use consistent field widths within the same form.
- Place helper text and validation messages close to the relevant field.
- Preserve entered values when validation fails.
- Make required and optional fields clear.
- Keep form actions in a predictable position.
- Use a clear focus border or outline based on the primary color.

### Cards and panels

- Use cards to group related information, not to wrap every individual element.
- Default surface: white.
- Border: 1 px solid `#E4E8E5`.
- Radius: 12 px.
- Padding: 16–24 px, depending on content density.
- Maintain consistent heading, metadata, and action placement.
- Avoid unnecessary nested cards.

### Tables and data lists

- Use clear column headings and consistent row heights.
- Align numeric values consistently.
- Keep row actions in a predictable location.
- Use subtle horizontal dividers instead of heavy cell borders.
- Provide empty, loading, and error states where relevant.
- Preserve enough whitespace for rows to remain easy to scan.

### Badges and status indicators

- Keep badges compact and readable.
- Green: active or positive status.
- Yellow: rating, recommendation, or attention highlight.
- Red: warning, error, discount, or destructive context.
- Pair color with a label or icon so the meaning is unambiguous.

### Icons

- Use one consistent outline icon family, preferably **Lucide**.
- Standard sizes:
  - 16 px for inline icons.
  - 20 px for buttons and controls.
  - 24 px for navigation.
- Use icons consistently and avoid mixing unrelated icon styles.
- Icon-only buttons must have accessible names and tooltips where useful.

## 7. Screen-level application

The supplied wireframes are the source of truth for screen structure and flow. Apply these shared rules to the corresponding screens without changing their intended functionality.

### Authentication screens

- Keep login and registration visually consistent.
- Use a focused form area with a comfortable maximum width of approximately 360–420 px.
- Display the **Darasa** brand clearly.
- Maintain clear field labels, validation feedback, and form actions.
- Make the main submit action visually dominant.
- Keep secondary links visually quieter.
- Avoid adding unrelated promotional content or decorative sections.

### Main application screens

- Keep the page title and its main action near the top of the content area.
- Preserve the navigation and content grouping from the wireframe.
- Make search, filters, and selection controls easy to locate.
- Use consistent spacing between content sections.
- Keep important information scannable through clear headings and restrained metadata.
- Apply green to active and primary actions; reserve red and yellow for their defined supporting roles.

### Detail, form, and selection screens

- Establish a clear title and summary area.
- Group related fields or information together.
- Make the current selection state obvious.
- Keep the next-step action easy to find.
- Use consistent form, card, and button patterns across related screens.
- Do not introduce new steps or fields that are not supported by the wireframe or product requirements.

## 8. Interaction states and motion

Every interactive component should define the states relevant to its behavior:

- Default
- Hover
- Active/pressed
- Focus-visible
- Disabled
- Loading
- Success
- Error

Motion guidelines:

- Hover and focus feedback: approximately 120–200 ms.
- Menus and popovers: approximately 160–240 ms.
- Prefer subtle opacity and small position changes.
- Avoid animation that delays task completion.
- Respect the user's reduced-motion preference.
- Provide confirmation before destructive actions that are difficult to reverse.

## 9. Accessibility

Aim for **WCAG 2.2 AA**.

- Maintain sufficient contrast for text and controls.
- Use semantic HTML elements and a logical heading hierarchy.
- Associate every form field with a visible label.
- Ensure all interactive elements are keyboard accessible.
- Make keyboard focus clearly visible.
- Give icon-only controls accessible names.
- Do not rely on color alone to convey meaning.
- Provide appropriate alternative text for meaningful images.
- Use empty alternative text for purely decorative images.
- Respect reduced-motion preferences.

## 10. Responsive fallback

This document is desktop-first, but the layout must remain usable at smaller widths.

- **1280 px and above:** use the full desktop layout.
- **1024–1279 px:** reduce outer gutters and tighten secondary columns.
- **Below 1024 px:** stack or collapse secondary regions and adapt navigation.
- Prevent horizontal overflow.
- Do not simply shrink the desktop layout uniformly.

## 11. Implementation guidance

- Define colors, spacing, typography, radius, and shadows as reusable design tokens.
- Reuse shared components instead of styling each screen independently.
- Keep visual states consistent across all screens.
- Prefer semantic component variants over one-off CSS overrides.
- Use the same spacing and typography scale throughout the application.
- Keep the implementation aligned with the supplied wireframes.
- Do not add a new color, font, radius, or shadow style without a clear product need.

## 12. Design quality checklist

Before considering a screen complete, verify:

- [ ] The product is named **Darasa** everywhere.
- [ ] The screen follows the supplied wireframe's structure and flow.
- [ ] The primary action is visually obvious.
- [ ] Green is the dominant brand accent; red and yellow are restrained.
- [ ] Typography and spacing follow this specification.
- [ ] Inputs have labels and clear validation states.
- [ ] Buttons have hover, focus, active, disabled, and loading states as applicable.
- [ ] Cards and panels are used only when they improve grouping.
- [ ] The layout works at the supported desktop widths.
- [ ] Keyboard focus and text contrast are accessible.
- [ ] Loading, empty, error, and success states are considered where relevant.
