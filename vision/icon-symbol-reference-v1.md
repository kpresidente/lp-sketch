# Icon and Symbol Reference v1

Status: Working implementation reference (authoritative baseline as of 2026-02-16).

## Purpose

Provide one durable reference for:
1. Tabler-to-workspace icon replication mapping.
2. Class/material variant expectations.
3. Overlay/export/legend parity requirements.
4. Approved exceptions and fallback rules.

## Authority and Precedence

1. `Roadmap.md` Appendix A is the canonical mapping source for icon replication.
2. This document expands that map into implementation rules.
3. If existing code behavior conflicts with `Roadmap.md` Appendix A, the roadmap map wins.
4. Changes to mapping decisions must be logged in the Roadmap Decision Log before implementation.

## Rendering Strategy

1. Workspace symbols are custom glyph implementations (SVG/canvas), not direct runtime Tabler SVG imports.
2. Tabler icon definitions are the visual source to replicate.
3. Overlay, export, and legend symbol rendering must use equivalent geometry and class/color logic.
4. Button/icon chrome can use Tabler icon components directly.

## Class Variant Policy

1. If a component row defines both Class I and Class II icons, class variants are mandatory.
2. Class I and Class II differences should be visible in workspace, legend, and export.
3. If a component row is `n/a` for class columns, class selection must not introduce a visual variant.

## Lettered Air Terminal Policy

1. Lettered air terminals use the `IconCircleLetter[A-Z]` family as visual source.
2. Workspace/export rendering uses circle plus centered letter text (inside the circle).
3. Letter rendering is intended to match Tabler semantics, not path-perfect letter tracing.

## Approved Exceptions

1. Ground rod:
   - UI button icon: Tabler `IconCircuitGround`.
   - Workspace/export symbol: custom elongated ground rod glyph.
2. `AT Arc`:
   - custom local icon derived from `IconDotsDiagonal` with offset middle dot.
3. `Steel Bond` Class II:
   - custom filled variant with contrasting asterisk.

## Component Mapping (Implementation Reference)

| COMPONENT | BUTTON ICON | CLASS 1 ICON | CLASS 2 ICON | NOTES |
| --- | --- | --- | --- | --- |
| Linear Conductor | IconLine | n/a | n/a | Tool icon only |
| Arc Conductor | IconVectorSpline | n/a | n/a | Tool icon only |
| Curve Conductor | IconMathMaxMin | n/a | n/a | Tool icon only |
| Air Terminal | IconCircle | IconCircle | IconCircleFilled | Supports optional letter variants |
| Air Terminal (Lettered A-Z) | IconCircleLetterA..IconCircleLetterZ | IconCircle + centered letter | IconCircleFilled + centered letter | Letter centered inside circle |
| Bonded Air Terminal | IconHexagon | IconHexagon | IconHexagonFilled | |
| AT Line | IconDots | n/a | n/a | Tool icon text should read `AT Line` |
| AT Arc | Custom (Tabler-derived) | n/a | n/a | Derived from `IconDotsDiagonal` |
| Bond | IconSquareRotated | IconSquareRotated | IconSquareRotatedFilled | |
| Cable Connection | IconPoint | IconPoint | IconPointFilled | Class variants are required |
| Cadweld Connection | IconCircleDot | IconCircleDot | IconCircleDotFilled | |
| Continued | IconEaseInOut | n/a | n/a | Directional |
| Connect Existing | IconEaseOutControlPointFilled | n/a | n/a | Directional |
| Conduit To Ground | IconCircleArrowDown | IconCircleArrowDown | IconCircleArrowDownFilled | Includes vertical footage input |
| Conduit To Roof | IconCircleChevronDown | IconCircleChevronDown | IconCircleChevronDownFilled | Includes vertical footage input |
| Surface To Ground | IconSquareArrowDown | IconSquareArrowDown | IconSquareArrowDownFilled | Includes vertical footage input |
| Surface To Roof | IconSquareChevronDown | IconSquareChevronDown | IconSquareChevronDownFilled | Includes vertical footage input |
| Through Roof | IconSquareAsterisk | IconSquareAsterisk | IconSquareAsteriskFilled | |
| Through Wall | IconCodeCircle | IconCodeCircle | IconCodeCircleFilled | |
| Steel Bond | IconSquareRotatedAsterisk | IconSquareRotatedAsterisk | Custom filled variant | Filled square + contrasting asterisk |
| Ground Rod | IconCircuitGround | Custom elongated ground rod | Custom elongated ground rod | Tabler for buttons only |

## Snap Marker Mapping

| SNAP | ICON |
| --- | --- |
| Endpoint | IconSquare |
| Intersection | IconX |
| Nearest | IconPointFilled |
| Perpendicular | IconChevronDownLeft |

## Validation Checklist

1. Each component in this map has one symbol definition used by overlay and export.
2. Legend symbol preview matches placed symbol geometry for the same class/material.
3. Class variant components visibly differ between Class I and Class II.
4. Ground rod exception is preserved (button vs workspace/export).
5. Lettered air terminals render letters centered in-circle, including export output.
