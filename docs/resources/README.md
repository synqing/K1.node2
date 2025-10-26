# Resources & Reference Materials

**Purpose:** Central hub for reusable guides, standards, schemas, and quick references.

**Steward:** @spectrasynq
**Last updated:** 2025-10-26
**Version:** 1.0

---

## Structure

```
docs/resources/
├── README.md (this file)
├── agent_quick_refs/
│   ├── SUPREME_analyst_cheatsheet.md
│   ├── ULTRA_choreographer_cheatsheet.md
│   ├── embedded_firmware_engineer_cheatsheet.md
│   ├── code_reviewer_quality_validator_cheatsheet.md
│   └── multiplier_orchestrator_cheatsheet.md
├── patterns/
│   ├── ADVANCED_CHOREOGRAPHY_PATTERNS.md
│   ├── PATTERN_AUDIO_API_REFERENCE.md
│   ├── PATTERN_AUDIO_QUICK_REFERENCE.md
│   ├── PATTERN_QUICK_START.md
│   └── PATTERN_VISUAL_GUIDE.md
├── performance_baseline_schema.md
├── testing_standards.md
└── [other references as added]
```

---

## Quick Navigation

### For Agents: Agent Quick Reference Cards

These are 1-2 page checklists for each agent persona. **Start here if you're an agent.**

| Agent Type | Reference | What It Covers |
|-----------|-----------|----------------|
| **SUPREME Analyst** | [SUPREME_analyst_cheatsheet.md](agent_quick_refs/SUPREME_analyst_cheatsheet.md) | Where to file forensic analysis, required artifacts, exit criteria, escalation paths |
| **ULTRA Choreographer** | [ULTRA_choreographer_cheatsheet.md](agent_quick_refs/ULTRA_choreographer_cheatsheet.md) | Design proposal/spec/validation structure, constraints analysis, dependencies |
| **Embedded Engineer** | [embedded_firmware_engineer_cheatsheet.md](agent_quick_refs/embedded_firmware_engineer_cheatsheet.md) | Code changes, test creation, runbook documentation, validation process |
| **Code Reviewer** | [code_reviewer_quality_validator_cheatsheet.md](agent_quick_refs/code_reviewer_quality_validator_cheatsheet.md) | Security/quality audits, test summary format, profiling reports, gate decisions |
| **Orchestrator** | [multiplier_orchestrator_cheatsheet.md](agent_quick_refs/multiplier_orchestrator_cheatsheet.md) | Workflow state management, precondition validation, escalation decision trees, phase transitions |

**How to use:**
1. Find your agent persona above
2. Click the cheatsheet link
3. Copy the templates
4. Fill in your data
5. File in the specified location

---

### For Standards: Methodology & Schemas

These define **how** to measure, test, and document things.

| Standard | File | Purpose |
|----------|------|---------|
| **Performance Baselines** | [performance_baseline_schema.md](performance_baseline_schema.md) | Standardized metrics collection (FPS, latency, CPU, memory), JSON schema, before/after comparison format |
| **Testing Standards** | [testing_standards.md](testing_standards.md) | What constitutes proof a fix works, test types (unit/integration/stress), test naming, coverage requirements |

**How to use:**
1. Before measuring anything → Read performance baseline schema
2. Before writing tests → Read testing standards
3. Use templates in those docs
4. Verify your output matches the schema

### For Multiplier Patterns: Strategic Tool Combinations

These unlock 5-10x productivity gains by combining tools strategically.

| Pattern | Quick Reference | Detailed Guide | Gain |
|---------|-----------------|----------------|------|
| **Design-to-Deployed** (ship features fast) | [Reference](multiplier_pattern_reference.md#recipe-1-design-to-deployed-feature-shipping) | [Patterns](workflow_multiplier_patterns.md#pattern-1-design-to-deployed-pipeline-5x-multiplier) | 5x |
| **Bug Detection & Fix** (production bugs) | [Reference](multiplier_pattern_reference.md#recipe-2-bug-detection--fix) | [Patterns](workflow_multiplier_patterns.md#pattern-2-bug-detection--systematic-fix-8x-multiplier) | 8x |
| **Architecture Evolution** (major redesign) | [Reference](multiplier_pattern_reference.md#recipe-3-architecture-evolution-major-redesign) | [Patterns](workflow_multiplier_patterns.md#pattern-3-architecture-evolution-10x-multiplier) | 10x |
| **Feature Pipeline** (large features) | [Reference](multiplier_pattern_reference.md#recipe-4-feature-pipeline-major-feature) | [Patterns](workflow_multiplier_patterns.md#pattern-4-feature-development-pipeline-7x-multiplier) | 7x |
| **Performance Loop** (optimization) | [Reference](multiplier_pattern_reference.md#recipe-5-performance-optimization-loop) | [Patterns](workflow_multiplier_patterns.md#pattern-5-performance-optimization-loop-6x-multiplier) | 6x |
| **Security Hardening** (vulnerabilities) | [Reference](multiplier_pattern_reference.md#recipe-6-security-hardening) | [Patterns](workflow_multiplier_patterns.md#pattern-6-security-hardening-8x-multiplier) | 8x |
| **Documentation Gen** (missing docs) | [Reference](multiplier_pattern_reference.md#recipe-7-documentation-generation) | [Patterns](workflow_multiplier_patterns.md#pattern-7-documentation-generation-5x-multiplier) | 5x |
| **Skill Development** (new skills/tools) | [Reference](multiplier_pattern_reference.md#recipe-8-skill-development-pipeline) | [Patterns](workflow_multiplier_patterns.md#pattern-8-skill-development-pipeline-6x-multiplier) | 6x |
| **Rapid Testing** (low coverage → 95%+) | [Reference](multiplier_pattern_reference.md#recipe-9-rapid-test-coverage) | [Patterns](workflow_multiplier_patterns.md#pattern-9-rapid-testing--coverage-7x-multiplier) | 7x |
| **ML Optimization** (model tuning) | [Reference](multiplier_pattern_reference.md#recipe-10-ml-model-optimization) | [Patterns](workflow_multiplier_patterns.md#pattern-10-ml-model-optimization-9x-multiplier) | 9x |

**How to use:**
1. Find your task in the matrix above
2. Look up the multiplier pattern
3. Read detailed guide for full explanation
4. Use quick reference for tool recipes
5. Execute following the implementation checklist

---

### For Architecture: ADRs & Documentation

| Resource | Location | Purpose |
|----------|----------|---------|
| **ADR Template** | [docs/adr/ADR-template.md](../adr/ADR-template.md) | Template for architectural decision records |
| **ADR Index** | [docs/adr/README.md](../adr/README.md) | Index of all ADRs, how to use ADRs, linking rules |

**How to use:**
1. If you find an architectural conflict → Create ADR
2. Copy [ADR-template.md](../adr/ADR-template.md)
3. Follow [ADR README](../adr/README.md) linking rules
4. Reference from SUPREME/ULTRA/Embedded artifacts

---

## Integration with Multiplier Workflow

The resources are organized by **when you use them** in the workflow:

```
Phase 1: Discovery (SUPREME)
├─ Uses: SUPREME_analyst_cheatsheet.md
├─ Produces: {SUBSYSTEM}_forensic_analysis.md
│           {SUBSYSTEM}_bottleneck_matrix.md
│           {SUBSYSTEM}_root_causes.md
└─ May escalate via: ADR (if architectural issue found)

Phase 2: Implementation (Embedded + ULTRA)
├─ Embedded uses: embedded_firmware_engineer_cheatsheet.md
│                testing_standards.md
├─ ULTRA uses: ULTRA_choreographer_cheatsheet.md
├─ Produces: firmware/src/{files}
│           firmware/test/{tests}/
│           Implementation.plans/runbooks/{fix}_implementation.md
└─ Measures using: performance_baseline_schema.md

Phase 3: Quality (Code Reviewer)
├─ Uses: code_reviewer_quality_validator_cheatsheet.md
│        performance_baseline_schema.md
│        testing_standards.md
├─ Produces: docs/reports/{PHASE}_code_review_report.md
│           docs/reports/{PHASE}_test_summary.md
│           docs/reports/{PHASE}_profiling_report.md
└─ May escalate via: ADR (if architecture conflict found)

Meta: Orchestration
└─ Uses: multiplier_orchestrator_cheatsheet.md
```

---

## File Organization Rules

**When you create a new resource:**

1. **Classify:** Is this a quick reference, standard, schema, or template?
2. **Destination:**
   - Quick reference (1-2 pages, agent-specific) → `agent_quick_refs/`
   - Standard/methodology → `docs/resources/` (top level)
   - Template → `docs/templates/` or copy to destination folder
3. **Naming:** Use descriptive, lowercase names: `{category}_{topic}.md`
4. **Link:** Update this README's navigation tables
5. **Reference:** Link from CLAUDE.md section that uses it

---

## Cross-References

**From CLAUDE.md:**
- Agent Playbooks section → Links to cheatsheets
- Multiplier Workflow section → Links to cheatsheets + standards
- Quality Gates section → Links to testing standards

**From docs/adr/:**
- ADR README → Links to escalation paths in CLAUDE.md

**From SUPREME analysis:**
- Links to code_reviewer_quality_validator_cheatsheet.md (how Tier 3 validates)

**From Embedded implementations:**
- Links to testing_standards.md (before writing tests)
- Links to performance_baseline_schema.md (before measuring)

**From Code reviewer reports:**
- Links to performance_baseline_schema.md (comparison method)
- Links to testing_standards.md (validation of test rigor)

---

## Maintenance

**Review cadence:** Weekly (with doc triage)
**Update trigger:** After each major phase of workflow (every ~1-2 weeks during active development)

**Check:**
- [ ] Links still valid
- [ ] Examples still reflect current practice
- [ ] Templates match current output
- [ ] No circular references

---

## Quick Start Workflows

### "I'm a SUPREME Analyst and ready to analyze a subsystem"

1. Read: [CLAUDE.md § Multiplier Workflow → Tier 1](../../CLAUDE.md)
2. Use: [SUPREME_analyst_cheatsheet.md](agent_quick_refs/SUPREME_analyst_cheatsheet.md)
3. Create: Three markdown files in `docs/analysis/{subsystem}/`
4. Verify: Against exit criteria in cheatsheet
5. File: Link from analysis to any ADRs if found

### "I'm an Embedded Engineer about to implement a fix"

1. Read: [embedded_firmware_engineer_cheatsheet.md](agent_quick_refs/embedded_firmware_engineer_cheatsheet.md)
2. Read: [testing_standards.md](testing_standards.md)
3. Implement: Code changes referencing BOTTLENECK_{N}
4. Test: Minimum 3 tests per fix
5. Document: Runbook before/after comparison
6. Measure: Using [performance_baseline_schema.md](performance_baseline_schema.md)

### "I'm a Code Reviewer and ready to validate a phase"

1. Read: [code_reviewer_quality_validator_cheatsheet.md](agent_quick_refs/code_reviewer_quality_validator_cheatsheet.md)
2. Review: Code against security checklist
3. Analyze: Tests against [testing_standards.md](testing_standards.md)
4. Measure: Using [performance_baseline_schema.md](performance_baseline_schema.md)
5. Report: Following templates in code_reviewer cheatsheet
6. Decide: All PASS / CONDITIONAL / HOLD

### "I found an architectural conflict"

1. Create: New ADR from [docs/adr/ADR-template.md](../adr/ADR-template.md)
2. Read: [docs/adr/README.md](../adr/README.md) linking rules
3. Escalate: To @spectrasynq with ADR draft
4. Reference: ADR from source analysis (SUPREME, ULTRA, or implementation)

---

## Version History

| Date | Change | Version |
|------|--------|---------|
| 2025-10-26 | Created initial resources suite: agent quick refs, standards, ADR system | 1.0 |

---

## Reference

- **Main guardrail:** [CLAUDE.md](../../CLAUDE.md)
- **Multiplier workflow:** [CLAUDE.md § Multiplier Workflow](../../CLAUDE.md)
- **Agent playbooks:** [CLAUDE.md § Agent Playbooks](../../CLAUDE.md)
