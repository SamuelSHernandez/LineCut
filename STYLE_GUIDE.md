# LineCut Style Guide

Reference this guide when building any UI/UX for LineCut.

## Brand Voice

- Direct, local, no bullshit
- Street-smart, not startup-polished
- Transactional with warmth
- Short sentences. Clear stakes.
- Like a local giving you the real tip
- **Never**: cutesy, corporate delivery-app speak, apologetic, or "platform" language

### Copy Examples

- Push notification: "Marco's 10 people from the counter. Your pastrami's close."
- Empty state: "Nobody's in line right now. Check back at lunch."
- Keep copy under 8 words when possible

## Color Palette

### Primary

| Name       | Hex       | Usage                                        |
|------------|-----------|----------------------------------------------|
| Ketchup    | `#C4382A` | Primary action color — buttons, links, urgency |
| Mustard    | `#E2A832` | Highlights, accents, waiter avatars           |
| Chalkboard | `#1A1A18` | All primary text and dark UI surfaces         |

### Supporting

| Name         | Hex       | Usage                                    |
|--------------|-----------|------------------------------------------|
| Butcher Paper| `#F5EDE0` | Default background — warm, not white     |
| Ticket       | `#FFFDF5` | Card backgrounds, elevated surfaces      |
| Sidewalk     | `#8C8778` | Secondary text, metadata, captions       |
| Neon         | `#FF6B35` | Sparingly — urgent callouts only         |

### Rules

- **Never use pure white (`#FFF`) or pure black (`#000`)**
- No gradients or glassmorphism
- No shadow on dark surfaces

## Typography

### Font Stack

| Role    | Font           | Usage                                         |
|---------|----------------|-----------------------------------------------|
| Display | Bebas Neue     | Headlines, nav labels — **all caps only**     |
| Body    | DM Sans        | Body text, UI labels, descriptions, buttons   |
| Mono    | JetBrains Mono | Metadata, timestamps, section labels, distances |

Google Fonts import:
```
Bebas Neue (400)
DM Sans (300, 400, 500, 600, 700; italic 400)
JetBrains Mono (400, 500)
```

### Type Scale

| Name    | Font    | Size | Usage                              |
|---------|---------|------|------------------------------------|
| Hero    | Display | 48px | Landing hero text                  |
| H1      | Display | 32px | Page headings                      |
| H2      | Display | 22px | Section headings                   |
| Body    | Body    | 15px | Primary content                    |
| Caption | Body    | 13px | Addresses, distances, secondary    |
| Meta    | Mono    | 11px | Timestamps, counts, labels (uppercase, letter-spacing 2-3px) |

## Components

### Buttons

| Variant   | Background    | Text Color  | Border                  |
|-----------|---------------|-------------|-------------------------|
| Primary   | Ketchup       | Ticket      | None                    |
| Mustard   | Mustard       | Chalkboard  | None                    |
| Secondary | Transparent   | Chalkboard  | 2px solid Chalkboard    |
| Ghost     | Transparent   | Ketchup     | None                    |

- Font: DM Sans, weight 600
- Border radius: 6px
- Sizes: sm (8px 16px / 12px), md (12px 24px / 14px), lg (16px 32px / 16px)
- Transition: all 0.2s ease

### Status Badges

| Variant  | Background | Text      | Usage              |
|----------|------------|-----------|--------------------|
| Waiting  | `#FFF3D6`  | `#8B6914` | In line            |
| Active   | `#DDEFDD`  | `#2D6A2D` | Spots available    |
| Complete | `#E8E8E8`  | `#666`    | Picked up / done   |

- Pill shape (border-radius: 100px)
- Font: DM Sans 11px, weight 600, uppercase, letter-spacing 0.3px

### Cards (Line Card)

- Background: Ticket (`#FFFDF5`)
- Border: 1px solid `#eee6d8`
- Border radius: 10px
- Padding: 20px
- Shadow: 0 4px 20px rgba(0,0,0,0.06)
- Use **dashed lines** (`1px dashed #ddd4c4`) as internal dividers (deli ticket motif)
- Show: restaurant name (Display font), address + distance, waiter name + wait time + rating, action button

### Avatars

- Circle (border-radius: 50%), 36px
- Background: Mustard
- Initials in Display font, 16px, Chalkboard color

### Navigation Tabs

- Font: DM Sans 13px
- Active: weight 600, Chalkboard color, 2px solid Ketchup bottom border
- Inactive: weight 400, Sidewalk color, transparent bottom border

## Iconography & Motifs

| Symbol     | Name        | Usage                                               |
|------------|-------------|-----------------------------------------------------|
| ✂ Scissors | The Cut     | Primary brand mark. Logo, loading, empty states only |
| ◉ Dot      | The Dot     | Person in line. Animated to show queue movement      |
| ⏤ Dashes   | Dashed Line | Deli-ticket tear line. All dividers — never solid rules |

**Texture note:** UI surfaces should feel like deli counter materials — butcher paper, chalkboard, ticket stubs. The aesthetic is analog, tactile, and New York.

## Spacing & Layout

- Base unit: **4px**. All spacing is multiples of 4.
- Card padding: 20px
- Section gaps: 48–64px
- Feel: roomy but not sparse — like a well-organized menu board, not a minimalist gallery

### Border Radius

| Element | Radius     |
|---------|------------|
| Cards   | 10px       |
| Buttons | 6px        |
| Badges  | 100px (pill) |
| Avatars | 50% (circle) |
| Inputs  | 6px        |

### Shadows

| Level    | Value                          |
|----------|--------------------------------|
| Cards    | 0 4px 20px rgba(0,0,0,0.06)   |
| Elevated | 0 8px 32px rgba(0,0,0,0.1)    |
| Pressed  | 0 1px 4px rgba(0,0,0,0.08)    |

## Principles

### Do

- Use dashed lines as dividers (deli ticket)
- Keep copy under 8 words when possible
- Show wait time estimates prominently
- Use the person's first name + last initial
- Make the primary action unmissable
- Show distance in blocks when under 0.5 mi

### Don't

- Use pure white or pure black
- Add gradients or glassmorphism
- Use stock photography
- Say "platform" or "marketplace"
- Overload with emojis
- Hide the wait time or fee
