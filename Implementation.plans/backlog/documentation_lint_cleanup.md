<!-- markdownlint-disable MD013 -->

# Documentation Lint Cleanup Backlog

- **Owner:** Documentation steward (@spectrasynq)

## Objective

Bring legacy Markdown files up to the linting baseline surfaced by  
`npx markdownlint-cli "**/*.md"` on 2025-10-26.

## High-Priority Targets

1. `CHOREOGRAPHY_DEPLOYMENT_SUMMARY.md`
   - Issues: MD013 (line length), MD022 (heading spacing), MD032 (list spacing),
     MD040 (code fence language), MD031 (fence spacing), MD036 (emphasis as heading).
   - Action: Refactor headings and lists, annotate long tables, add code fence languages.
2. `START_HERE.md`
   - Issues: MD013, MD032.
   - Action: Insert blank lines around lists, evaluate line-length exemptions or reflow text.
3. `README.md`
   - Issues: MD013, MD031, MD032, MD036.
   - Action: Add blank lines around code fences and lists, convert emphasised headers to `###` headings.

## Follow-Up Queue

- Audit `docs/reports/` for large tables causing MD013; consider scoped disables with comments.
- Review pattern documentation under `docs/resources/patterns/` (e.g., `PATTERN_AUDIO_API_REFERENCE.md`) for missing fence languages.
- Track completion status in the weekly doc triage log.

## Notes

- Prefer fixing formatting over disabling rules unless readability would suffer.
- Record each cleanup pass in commit messages with `docs(lint): ...` to keep history clear.

<!-- markdownlint-enable MD013 -->
