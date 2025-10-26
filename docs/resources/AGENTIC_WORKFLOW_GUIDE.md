# Agentic Workflow Guide: workflow-orchestrator + code-operations-skills

A comprehensive guide to using workflow automation and code manipulation tools together for maximum development velocity.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [Individual Tool Workflows](#individual-tool-workflows)
3. [Combined Agentic Workflows](#combined-agentic-workflows)
4. [Real-World Scenarios](#real-world-scenarios)
5. [Decision Matrix](#decision-matrix)
6. [Advanced Patterns](#advanced-patterns)

---

## Core Concepts

### Three Layers of Automation

```
┌─────────────────────────────────────────────────────┐
│  WORKFLOW LAYER (workflow-orchestrator)             │
│  ↓ Task orchestration, parallelization, history     │
├─────────────────────────────────────────────────────┤
│  CODE MANIPULATION LAYER (code-operations-skills)   │
│  ↓ Refactoring, transfer, analysis                  │
├─────────────────────────────────────────────────────┤
│  EXECUTION LAYER (Bash, Git, npm, etc.)            │
│  ↓ Actual system commands and operations            │
└─────────────────────────────────────────────────────┘
```

### Key Principle

**Don't manually repeat tasks. Orchestrate them.**

If you find yourself doing the same sequence of operations (analysis → refactor → test → commit), that's a candidate for workflow automation.

---

## Individual Tool Workflows

### Pattern 1: Bulk Code Refactoring (code-refactor skill)

**Scenario:** You need to rename a function or update an API call across your entire codebase.

**Workflow Steps:**

```
1. Search Phase (Grep)
   └─ Find all occurrences of the old pattern
   └─ Understand scope (how many files, how many instances)

2. Preview Phase (Display findings)
   └─ Show user what will change
   └─ Confirm scope is correct

3. Refactor Phase (code-refactor)
   └─ Use bulk replacement across all files
   └─ Maintain consistency

4. Verification Phase (Grep)
   └─ Re-search to confirm all replacements
   └─ Check for any missed instances

5. Testing Phase (Bash)
   └─ Run test suite to validate changes
   └─ Commit if all tests pass
```

**Agentic Command Example:**

```
"Rename getUserData to fetchUserData everywhere in the codebase"

Claude execution:
→ Grep: Found 15 occurrences in 5 files
→ code-refactor: Replace all instances
→ Grep: Verify all replaced
→ Bash: Run tests
→ Bash: Git commit
```

**When to use:** Large-scale consistent changes across the codebase

---

### Pattern 2: Code Relocation (code-transfer skill)

**Scenario:** Extract a utility module that's grown too large, or move a class to a new file.

**Workflow Steps:**

```
1. Analysis Phase (file-operations)
   └─ Understand file structure and size
   └─ Identify extraction candidates

2. Planning Phase (Manual review)
   └─ Determine which code should move
   └─ Identify dependencies

3. Transfer Phase (code-transfer)
   └─ Extract code to new file
   └─ Create necessary imports

4. Update Phase (code-refactor)
   └─ Update all imports across codebase
   └─ Remove old code from original file

5. Verification Phase (Bash)
   └─ Run tests and type checking
   └─ Commit changes
```

**Agentic Command Example:**

```
"Move the DatabaseConnection class from src/app.js to src/database.js"

Claude execution:
→ file-operations: Analyze src/app.js structure
→ code-transfer: Extract DatabaseConnection class
→ code-transfer: Create src/database.js with class
→ code-refactor: Update import statements across codebase
→ Bash: Run tests
→ Bash: Git commit
```

**When to use:** Reorganizing code into better modules or splitting large files

---

### Pattern 3: Code Analysis (file-operations skill)

**Scenario:** Understand codebase structure before making large changes.

**Workflow Steps:**

```
1. Scan Phase (file-operations)
   └─ Get metrics on target file(s)
   └─ Line counts, function counts, complexity

2. Analysis Phase (Grep)
   └─ Understand dependencies
   └─ Find related code

3. Report Phase (Display findings)
   └─ Show statistics and insights
   └─ Suggest optimizations

4. Plan Phase (Manual or automated)
   └─ Decide on refactoring strategy
   └─ Break into smaller tasks
```

**Agentic Command Example:**

```
"Analyze utils.js and tell me about its structure"

Claude execution:
→ file-operations: Get size, line count, functions
→ Grep: Find all imported modules
→ Display: Show comprehensive analysis
→ Suggest: Recommend refactoring if needed
```

**When to use:** Before starting any large refactoring to understand impact

---

## Combined Agentic Workflows

### Workflow A: Multi-Stage Code Refactoring Pipeline

**Goal:** Large-scale refactoring project with safety checks at each stage.

**Setup with workflow-orchestrator:**

```json
{
  "name": "Refactor API Layer",
  "tasks": [
    {
      "id": "analyze",
      "name": "Analyze API files",
      "command": "file-operations analyze src/api/*.js",
      "dependencies": []
    },
    {
      "id": "find-old-pattern",
      "name": "Find deprecated pattern",
      "command": "grep -r 'oldApiCall' src/",
      "dependencies": ["analyze"]
    },
    {
      "id": "refactor-api",
      "name": "Replace API calls",
      "command": "code-refactor oldApiCall newApiCall",
      "dependencies": ["find-old-pattern"]
    },
    {
      "id": "unit-tests",
      "name": "Run unit tests",
      "command": "npm run test:unit",
      "dependencies": ["refactor-api"]
    },
    {
      "id": "integration-tests",
      "name": "Run integration tests",
      "command": "npm run test:integration",
      "dependencies": ["refactor-api"]
    },
    {
      "id": "lint",
      "name": "Lint code",
      "command": "npm run lint",
      "dependencies": ["unit-tests", "integration-tests"]
    },
    {
      "id": "commit",
      "name": "Commit changes",
      "command": "git commit -m 'refactor: update API calls'",
      "dependencies": ["lint"]
    }
  ]
}
```

**Execution:**

```
execute_workflow({
  workflowId: "wf_refactor_api",
  parallel: true
})

Execution Graph:
  analyze
    ↓
  find-old-pattern
    ↓
  refactor-api
    ↓  ↓
  unit-tests   integration-tests  (parallel)
    ↓  ↓
    └──lint
       ↓
     commit
```

**Benefits:**
- Unit and integration tests run in parallel
- Automatic rollback if any test fails
- Complete run history for auditing
- Can re-run specific tasks if one fails

---

### Workflow B: Large Codebase Refactoring with Modularization

**Goal:** Split a monolithic utility module into focused, single-purpose files.

**Execution Sequence:**

```
Phase 1: ANALYSIS
┌─ file-operations: Analyze utils.js
│  └─ Found: 45 functions, 1,245 lines
│  └─ Identified categories: string, file, math, date
│
Phase 2: REFACTOR (Sequential)
├─ code-transfer: Extract string utilities
│  └─ Create: string_utils.js
│  └─ Transfer: 12 functions
│
├─ code-transfer: Extract file utilities
│  └─ Create: file_utils.js
│  └─ Transfer: 18 functions
│
├─ code-transfer: Extract math utilities
│  └─ Create: math_utils.js
│  └─ Transfer: 10 functions
│
├─ code-transfer: Extract date utilities
│  └─ Create: date_utils.js
│  └─ Transfer: 5 functions
│
Phase 3: IMPORT UPDATE (Single refactor)
└─ code-refactor: Update all imports
   └─ Find: 23 files importing utils.js
   └─ Update: All import statements
   └─ Verify: No broken imports

Phase 4: VERIFICATION
├─ Bash: Run linter
├─ Bash: Run type checker
├─ Bash: Run full test suite
└─ Bash: Git commit
```

**As an Agentic Task:**

```
Command: "Split utils.js into focused utility modules"

Claude's Agentic Workflow:
1. file-operations: Analyze utils.js structure
2. Categorize functions mentally (string, file, math, date)
3. code-transfer: Extract string_utils.js
4. code-transfer: Extract file_utils.js
5. code-transfer: Extract math_utils.js
6. code-transfer: Extract date_utils.js
7. code-refactor: Update all imports across 23 files
8. Bash: Run type checking (npm run type-check)
9. Bash: Run tests (npm test)
10. Bash: Git commit with message
```

**Why this is powerful:**
- Single user command triggers multi-step intelligent workflow
- AI understands categories and organizes accordingly
- Automatic import updates save hours of manual work
- Full verification at each step

---

### Workflow C: Continuous Refactoring Pipeline

**Goal:** Run refactoring checks and updates on a schedule or trigger.

**Multi-Day Orchestration:**

```
Day 1: CODE ANALYSIS & PLANNING
├─ file-operations: Scan all .js files
├─ Grep: Find code smells and patterns
└─ Generate: Refactoring report

Day 2: SYSTEMATIC REFACTORING
├─ [Parallel Execution]
│  ├─ code-refactor: Fix deprecated patterns
│  ├─ code-refactor: Update deprecated APIs
│  └─ code-refactor: Fix linting issues
└─ Merge results

Day 3: MODULARIZATION
├─ code-transfer: Extract utility modules
├─ code-transfer: Extract component libraries
└─ code-refactor: Update all imports

Day 4: VERIFICATION & CLEANUP
├─ Bash: Full test suite
├─ Bash: Type checking
├─ Bash: Linting
├─ Bash: Performance analysis
└─ Bash: Commit and push
```

**Workflow JSON:**

```json
{
  "name": "Weekly Code Quality Pipeline",
  "schedule": "0 8 * * 1",  // Weekly on Monday
  "tasks": [
    {
      "id": "scan",
      "name": "Scan codebase",
      "command": "file-operations scan-all",
      "dependencies": []
    },
    {
      "id": "find-issues",
      "name": "Find code issues",
      "command": "grep -r 'TODO\\|FIXME\\|HACK' src/",
      "dependencies": ["scan"]
    },
    {
      "id": "report",
      "name": "Generate report",
      "command": "generate-report",
      "dependencies": ["find-issues"]
    },
    {
      "id": "fix-patterns",
      "name": "Fix deprecated patterns",
      "command": "code-refactor patterns",
      "dependencies": ["report"]
    },
    {
      "id": "extract-modules",
      "name": "Extract reusable modules",
      "command": "code-transfer extract-modules",
      "dependencies": ["fix-patterns"]
    },
    {
      "id": "test",
      "name": "Full test suite",
      "command": "npm test",
      "dependencies": ["extract-modules"]
    },
    {
      "id": "commit",
      "name": "Commit changes",
      "command": "git commit -m 'chore: code quality improvements'",
      "dependencies": ["test"]
    }
  ]
}
```

---

## Real-World Scenarios

### Scenario 1: API Migration

**Situation:** Your entire codebase uses `fetch()` directly, but you're migrating to an `httpClient` utility.

**Manual Approach (8 hours):**
1. Find all fetch calls (30 min)
2. Review each one (2 hours)
3. Replace one by one (3 hours)
4. Fix errors (2 hours)
5. Test (30 min)

**Agentic Approach (15 minutes + automation):**

```
Command: "Migrate all fetch() calls to httpClient across the codebase"

Workflow:
1. Grep: Find all fetch occurrences (automatically scoped)
2. file-operations: Analyze impact (which files affected)
3. Show user: "Found 47 fetch calls in 12 files"
4. code-refactor: Replace all fetch( with httpClient(
5. Verify: Check for syntax errors
6. Bash: Run tests
7. Bash: Commit

Result: 47 replacements in 12 files, verified, tested, committed. 15 min elapsed.
```

**Key insight:** The workflow reduces manual effort from 8 hours to 15 minutes by:
- Automating the find/replace
- Parallelizing tests
- Automatic verification
- One-shot commit

---

### Scenario 2: Framework Upgrade

**Situation:** Update React components from class-based to functional hooks.

**Traditional Approach (Days of work):**
1. Manually identify class components
2. Convert each one carefully
3. Test each conversion
4. Fix subtle bugs
5. Run full test suite

**Agentic Orchestrated Approach:**

```json
{
  "name": "React Class to Hooks Migration",
  "tasks": [
    {
      "id": "identify",
      "name": "Find class components",
      "command": "grep -r 'class.*extends React.Component' src/components/",
      "dependencies": []
    },
    {
      "id": "analyze",
      "name": "Analyze components",
      "command": "file-operations analyze-all src/components/",
      "dependencies": ["identify"]
    },
    {
      "id": "convert-batch-1",
      "name": "Convert batch 1 (5 components)",
      "command": "code-transfer convert-components batch-1",
      "dependencies": ["analyze"]
    },
    {
      "id": "convert-batch-2",
      "name": "Convert batch 2 (5 components)",
      "command": "code-transfer convert-components batch-2",
      "dependencies": ["analyze"]
    },
    {
      "id": "convert-batch-3",
      "name": "Convert batch 3 (remaining)",
      "command": "code-transfer convert-components batch-3",
      "dependencies": ["analyze"]
    },
    {
      "id": "unit-test",
      "name": "Unit tests",
      "command": "npm run test:unit",
      "dependencies": ["convert-batch-1", "convert-batch-2", "convert-batch-3"]
    },
    {
      "id": "integration-test",
      "name": "Integration tests",
      "command": "npm run test:integration",
      "dependencies": ["convert-batch-1", "convert-batch-2", "convert-batch-3"]
    },
    {
      "id": "e2e-test",
      "name": "E2E tests",
      "command": "npm run test:e2e",
      "dependencies": ["unit-test", "integration-test"]
    },
    {
      "id": "commit",
      "name": "Commit migration",
      "command": "git commit -m 'refactor: migrate to functional components'",
      "dependencies": ["e2e-test"]
    }
  ]
}
```

**Execution:** Three conversion batches run and test in parallel. Full test suite validates before commit.

---

### Scenario 3: Security Patch Rollout

**Situation:** Critical dependency needs patching. Must update, test, and deploy across all environments.

```json
{
  "name": "Security Patch Rollout",
  "tasks": [
    {
      "id": "update-deps",
      "name": "Update dependencies",
      "command": "npm update vulnerable-package",
      "dependencies": []
    },
    {
      "id": "scan",
      "name": "Security scan",
      "command": "npm audit",
      "dependencies": ["update-deps"]
    },
    {
      "id": "unit-test",
      "name": "Unit tests",
      "command": "npm run test:unit",
      "dependencies": ["scan"]
    },
    {
      "id": "integration-test",
      "name": "Integration tests",
      "command": "npm run test:integration",
      "dependencies": ["scan"]
    },
    {
      "id": "e2e-test",
      "name": "E2E tests",
      "command": "npm run test:e2e",
      "dependencies": ["unit-test", "integration-test"]
    },
    {
      "id": "build",
      "name": "Build for production",
      "command": "npm run build",
      "dependencies": ["e2e-test"]
    },
    {
      "id": "deploy-staging",
      "name": "Deploy to staging",
      "command": "npm run deploy:staging",
      "dependencies": ["build"]
    },
    {
      "id": "smoke-test",
      "name": "Smoke tests on staging",
      "command": "npm run test:smoke",
      "dependencies": ["deploy-staging"]
    },
    {
      "id": "deploy-prod",
      "name": "Deploy to production",
      "command": "npm run deploy:production",
      "dependencies": ["smoke-test"]
    },
    {
      "id": "monitor",
      "name": "Monitor deployment",
      "command": "npm run monitor:health",
      "dependencies": ["deploy-prod"]
    }
  ]
}
```

**Parallel execution:**
- Unit and integration tests run concurrently
- Entire pipeline automated with safety gates
- Complete audit trail of all steps

---

## Decision Matrix

### When to use which tool?

```
┌─────────────────────────────────────────────────────────┬──────────────────┐
│ Task                                                    │ Use Tool         │
├─────────────────────────────────────────────────────────┼──────────────────┤
│ Rename function/variable everywhere                     │ code-refactor    │
│ Replace deprecated pattern across codebase              │ code-refactor    │
│ Move class to new file                                  │ code-transfer    │
│ Extract utility module from large file                  │ code-transfer    │
│ Insert code at specific line numbers                    │ code-transfer    │
│ Understand file structure/metrics                       │ file-operations  │
│ Build → Test → Deploy sequence                          │ workflow-orch.   │
│ Parallel execution of independent tasks                 │ workflow-orch.   │
│ Multi-stage pipeline with conditional logic             │ workflow-orch.   │
│ API migration across entire codebase                    │ code-refactor    │
│ Framework upgrade (batched conversion)                  │ workflow-orch.   │
│ One-off code change in single file                      │ Edit tool        │
│ Search for pattern/occurrences                          │ Grep tool        │
└─────────────────────────────────────────────────────────┴──────────────────┘
```

### Decision Tree

```
START: Need to automate something?
│
├─ Need to MOVE/TRANSFER code?
│  └─ YES → code-transfer skill
│
├─ Need to REPLACE pattern EVERYWHERE?
│  └─ YES → code-refactor skill
│
├─ Need to ANALYZE code structure?
│  └─ YES → file-operations skill
│
├─ Need to RUN SEQUENCE of tasks with dependencies?
│  └─ YES → workflow-orchestrator
│
├─ Need PARALLEL execution?
│  └─ YES → workflow-orchestrator
│
└─ Need to COMBINE multiple steps?
   ├─ YES + complex logic → workflow-orchestrator
   └─ YES + simple sequence → Combine manually with agentic instructions
```

---

## Advanced Patterns

### Pattern 1: Conditional Workflows

**Use Case:** Different refactoring paths based on test results.

**Pseudo-code concept:**

```javascript
const workflow = {
  name: "Smart Refactoring Pipeline",
  tasks: [
    {
      id: "analyze",
      name: "Analyze codebase",
      command: "file-operations scan",
      dependencies: []
    },
    {
      id: "detect-issues",
      name: "Detect code issues",
      command: "npm run analyze:issues",
      dependencies: ["analyze"]
    },
    {
      // Based on detect-issues output:
      // If complexity issues → run complexity refactoring
      // If deprecated patterns → run pattern refactoring
      id: "conditional-refactor",
      name: "Apply targeted refactoring",
      command: "conditional-execute",
      dependencies: ["detect-issues"],
      conditions: {
        "high-complexity": "code-refactor --simplify",
        "deprecated-patterns": "code-refactor --update-patterns",
        "poor-modularity": "code-transfer --modularize"
      }
    },
    {
      id: "test",
      name: "Test refactored code",
      command: "npm test",
      dependencies: ["conditional-refactor"]
    }
  ]
}
```

---

### Pattern 2: Incremental Migration

**Use Case:** Large refactoring that takes time and can't be done in one go.

**Multi-day Agentic Approach:**

```
Day 1:
Task: "Analyze migration scope"
→ file-operations: Get baseline metrics
→ Grep: Find all instances to migrate
→ Report: Generate migration plan

Day 2:
Task: "Migrate batch 1 (first 25% of files)"
→ code-transfer: Move code
→ code-refactor: Update imports
→ Tests pass? Continue.

Day 3:
Task: "Migrate batch 2 (next 25% of files)"
→ Same as Day 2

Day 4:
Task: "Migrate batch 3 (next 25% of files)"
→ Same as Day 2

Day 5:
Task: "Migrate batch 4 (final 25% of files)"
→ Same as Day 2

Day 6:
Task: "Final verification and cleanup"
→ Full test suite
→ Type checking
→ Performance analysis
→ Commit final batch
```

**Benefits:**
- Low risk (each batch is reversible)
- Can pause and resume
- Issues caught early in migration
- Team can review changes incrementally

---

### Pattern 3: CI/CD Integration

**Use Case:** Continuous improvement automation.

```javascript
// .github/workflows/code-quality.yml equivalent
{
  name: "Continuous Code Quality",
  schedule: "0 2 * * *",  // 2 AM daily
  tasks: [
    {
      id: "lint-scan",
      command: "npm run lint -- --output json",
      dependencies: []
    },
    {
      id: "analyze-coverage",
      command: "npm run coverage",
      dependencies: []
    },
    {
      id: "find-dead-code",
      command: "grep -r 'TODO\\|FIXME\\|HACK\\|XXX' src/",
      dependencies: []
    },
    {
      id: "auto-fix-lint",
      name: "Auto-fix linting issues",
      command: "npm run lint -- --fix",
      dependencies: ["lint-scan"]
    },
    {
      id: "auto-format",
      name: "Auto-format code",
      command: "npm run format",
      dependencies: ["lint-scan"]
    },
    {
      id: "test",
      name: "Full test suite",
      command: "npm test",
      dependencies: ["auto-fix-lint", "auto-format"]
    },
    {
      id: "commit",
      name: "Commit automated fixes",
      command: "git commit -m 'chore: automated code quality improvements'",
      dependencies: ["test"]
    }
  ]
}
```

---

### Pattern 4: Multi-Repository Orchestration

**Use Case:** Coordinated changes across multiple repos.

```
Command: "Update all projects to use new shared-utils version"

Workflow:
For each repo in ["app", "web", "mobile", "api"]:
  1. Clone/fetch latest
  2. Update shared-utils dependency
  3. Run code-refactor to update API calls if breaking
  4. Run test suite
  5. Commit and create PR
  6. Done when all PRs are created
```

---

## Best Practices

### 1. Always Analyze Before Acting

```
DON'T:  "Rename getUserData to fetchUserData"
DO:     "Find all getUserData occurrences, show me the scope,
         then rename to fetchUserData"
```

### 2. Batch Related Operations

```
DON'T:  Run refactoring, then testing, then linting separately
DO:     Create a workflow where refactoring → testing → linting
        are coordinated as one pipeline
```

### 3. Parallel Independent Tasks

```
DON'T:  Run unit tests, wait, then run integration tests
DO:     Run them in parallel, wait for both to finish
```

### 4. Use Run History for Learning

```
After each workflow execution, review:
- What succeeded?
- What took longer than expected?
- What would be faster if parallelized?
- Can this be optimized?
```

### 5. Start Small, Scale Up

```
First refactoring: Single file, verify it works
Second refactoring: Small module, verify it works
Third refactoring: Large module with full pipeline
```

---

## Implementation Roadmap

### Week 1: Master Individual Tools
- [ ] Use code-refactor for 2-3 small changes
- [ ] Use code-transfer to move one module
- [ ] Use file-operations for code analysis

### Week 2: Create First Workflow
- [ ] Create simple 3-4 task workflow
- [ ] Execute with workflow-orchestrator
- [ ] Verify output and history

### Week 3: Advanced Patterns
- [ ] Create multi-stage pipeline
- [ ] Implement parallel execution
- [ ] Add conditional logic

### Week 4: Integration & Automation
- [ ] Integrate with CI/CD
- [ ] Create scheduled workflows
- [ ] Build team documentation

---

## Troubleshooting

### Workflow fails at task N
1. Check `get_workflow` for error message
2. Review task N logs
3. Fix underlying issue
4. Restart workflow or re-run specific tasks

### Code refactoring introduced bugs
1. Revert: `git revert <commit-hash>`
2. Review refactoring scope more carefully
3. Add more test coverage before next attempt
4. Consider smaller batch sizes

### Performance: Pipeline takes too long
1. Check `get_workflow` for bottleneck
2. Identify tasks that can't be parallelized
3. Consider splitting into multiple pipelines
4. Look for redundant tasks

---

## Conclusion

These three tools represent a fundamental shift in how you can approach code maintenance:

- **Without automation:** Days of manual work, error-prone, difficult to repeat
- **With workflow orchestration:** Hours of coordinated work, verifiable, repeatable

The real power comes from combining them:
1. **code-operations-skills** handle the "what" (analyzing, transferring, refactoring code)
2. **workflow-orchestrator** handles the "how" (sequencing, parallelizing, tracking)
3. **Agentic instruction** provides the "why" (business logic and decision-making)

Start with simple workflows. Scale to complex pipelines. Automate your entire development workflow.
