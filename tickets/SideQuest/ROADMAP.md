# SideQuest Roadmap

Generated: 2026-04-21T12:10:52.260Z
Repository: Tihik

## Summary
- Scanned Files: 174
- Issues Found: 17
- Tickets Generated: 13
- Roadmap File: tickets/SideQuest/ROADMAP.md

## Top Findings
- large-file: 14
- debug: 3

## Suggested Features
- Create a refactor roadmap for oversized modules and track progress per sprint.
- Add end-to-end smoke checks for core user flows and publish pass/fail status daily.

## Tickets
### SQ-001 - Refactor oversized module: components/transactions-manager/transactions-manager-screen.tsx
Rationale: File has 2342 lines, above the 300-line maintainability threshold.
Actions:
1. Split by feature boundary or hook/component/service layers.
2. Add focused unit tests around extracted logic.
3. Re-run lint and type checks before merge.

### SQ-002 - Refactor oversized module: components/dashboard-dashboard.tsx
Rationale: File has 1712 lines, above the 300-line maintainability threshold.
Actions:
1. Split by feature boundary or hook/component/service layers.
2. Add focused unit tests around extracted logic.
3. Re-run lint and type checks before merge.

### SQ-003 - Refactor oversized module: components/installments-manager/installments-manager-screen.tsx
Rationale: File has 1166 lines, above the 300-line maintainability threshold.
Actions:
1. Split by feature boundary or hook/component/service layers.
2. Add focused unit tests around extracted logic.
3. Re-run lint and type checks before merge.

### SQ-004 - Refactor oversized module: components/collaboration-manager/collaboration-manager-screen.tsx
Rationale: File has 1063 lines, above the 300-line maintainability threshold.
Actions:
1. Split by feature boundary or hook/component/service layers.
2. Add focused unit tests around extracted logic.
3. Re-run lint and type checks before merge.

### SQ-005 - Refactor oversized module: lib/wallet-badges.ts
Rationale: File has 635 lines, above the 300-line maintainability threshold.
Actions:
1. Split by feature boundary or hook/component/service layers.
2. Add focused unit tests around extracted logic.
3. Re-run lint and type checks before merge.

### SQ-006 - Refactor oversized module: app/api/assistant/transaction-actions.ts
Rationale: File has 595 lines, above the 300-line maintainability threshold.
Actions:
1. Split by feature boundary or hook/component/service layers.
2. Add focused unit tests around extracted logic.
3. Re-run lint and type checks before merge.

### SQ-007 - Refactor oversized module: components/ui/category-combobox.tsx
Rationale: File has 465 lines, above the 300-line maintainability threshold.
Actions:
1. Split by feature boundary or hook/component/service layers.
2. Add focused unit tests around extracted logic.
3. Re-run lint and type checks before merge.

### SQ-008 - Refactor oversized module: app/api/dashboard/route.ts
Rationale: File has 462 lines, above the 300-line maintainability threshold.
Actions:
1. Split by feature boundary or hook/component/service layers.
2. Add focused unit tests around extracted logic.
3. Re-run lint and type checks before merge.

### SQ-009 - Refactor oversized module: components/account-overview/use-account-overview.ts
Rationale: File has 361 lines, above the 300-line maintainability threshold.
Actions:
1. Split by feature boundary or hook/component/service layers.
2. Add focused unit tests around extracted logic.
3. Re-run lint and type checks before merge.

### SQ-010 - Refactor oversized module: components/ai-assistant-widget/use-ai-assistant-widget.ts
Rationale: File has 359 lines, above the 300-line maintainability threshold.
Actions:
1. Split by feature boundary or hook/component/service layers.
2. Add focused unit tests around extracted logic.
3. Re-run lint and type checks before merge.

### SQ-011 - Remove debug artifact: scripts/backfill-transaction-accounts.mjs
Rationale: Debug statements can leak noise or sensitive context in production logs.
Actions:
1. Remove console/debugger statements.
2. Replace with structured logging where needed.
3. Add lint rule to prevent regressions.

### SQ-012 - Remove debug artifact: scripts/sidequest-roadmap.mjs
Rationale: Debug statements can leak noise or sensitive context in production logs.
Actions:
1. Remove console/debugger statements.
2. Replace with structured logging where needed.
3. Add lint rule to prevent regressions.

### SQ-013 - Remove debug artifact: scripts/start-postgres.mjs
Rationale: Debug statements can leak noise or sensitive context in production logs.
Actions:
1. Remove console/debugger statements.
2. Replace with structured logging where needed.
3. Add lint rule to prevent regressions.

