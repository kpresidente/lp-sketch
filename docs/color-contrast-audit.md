# Color Contrast Audit

Date: 2026-02-19

Audit command:

```bash
npm run audit:contrast
```

Result: PASS (all configured checks met WCAG AA 4.5:1 threshold for normal text).

## Checked Pairs

- Primary text on cards: 17.74
- Secondary text on cards: 10.31
- Tertiary text on cards: 4.83
- Muted text on cards: 5.98
- Muted text on base background: 5.24
- Section labels: 5.14
- Panel headers: 9.13
- Active button text: 8.10
- Scale badge text: 8.78
- Success status text: 5.02
- Error status text: 6.47

## Notes

- The contrast audit is automated by `scripts/contrast-audit.mjs`.
- Gate 6 contrast acceptance is based on this repeatable script output.
