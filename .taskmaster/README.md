# Taskmaster Setup for K1.reinvented

## Overview

This project uses **Taskmaster** (vanilla setup) for Phase B task management. The setup is intentionally minimal to align with the project's radical minimalism philosophy.

## Why Vanilla Taskmaster?

K1.reinvented is built on radical minimalism (1,200 lines of code). Adding full governance frameworks would contradict the core mission. Instead, we use vanilla Taskmaster for:

- AI-driven task generation from PRDs
- Hierarchical task organization
- Progress tracking for Phase B expansion
- Research-backed task planning

## Directory Structure

```
.taskmaster/
├── config.json           # AI model configuration
├── state.json           # Runtime state
├── tasks/
│   └── tasks.json       # Task database
├── docs/
│   └── phase-b-expansion.txt  # Phase B PRD
└── README.md            # This file
```

## Quick Start

### 1. Generate Tasks from PRD

```bash
cd /path/to/K1.reinvented
task-master parse-prd .taskmaster/docs/phase-b-expansion.txt
```

This will generate tasks for Phase B node expansion.

### 2. View Tasks

```bash
# List all tasks
task-master list

# Show next available task
task-master next

# Show specific task
task-master show 1.2
```

### 3. Work on Tasks

```bash
# Mark as in-progress
task-master set-status --id=1.2 --status=in-progress

# Update with progress notes
task-master update-subtask --id=1.2 --prompt="Implemented radial node type, compiles cleanly"

# Mark as done
task-master set-status --id=1.2 --status=done
```

### 4. Expand Tasks (Optional)

```bash
# Break complex task into subtasks
task-master expand --id=1 --research

# Expand all pending tasks
task-master expand --all --research
```

## Configuration

### AI Models

Current configuration:
- **Main:** Claude 3.5 Sonnet (task generation, planning)
- **Research:** Perplexity Llama 3.1 (research-backed expansion)
- **Fallback:** GPT-4o Mini (backup)

To change models:
```bash
task-master models --setup
```

### API Keys

Add to `.env` file in project root:
```bash
ANTHROPIC_API_KEY=sk-ant-...
PERPLEXITY_API_KEY=pplx-...
OPENAI_API_KEY=sk-...
```

## MCP Integration (Optional)

For Claude Desktop/Cursor integration, add to `.mcp.json`:

```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "task-master-ai"],
      "env": {
        "TASK_MASTER_TOOLS": "core",
        "ANTHROPIC_API_KEY": "sk-ant-...",
        "PERPLEXITY_API_KEY": "pplx-..."
      }
    }
  }
}
```

## Philosophy Alignment

**This Taskmaster setup adheres to K1.reinvented's core principles:**

1. **Minimalism:** Vanilla setup, no heavyweight governance
2. **Intentionality:** Tasks serve the mission, not busy-work
3. **Clarity:** Every task should be clear about "why" not just "what"
4. **No Compromise:** Tasks must maintain 450+ FPS and <2,000 LOC constraints

## Workflow Patterns

### Solo Developer Pattern

```bash
# Morning: Check next task
task-master next

# During work: Update progress
task-master update-subtask --id=<id> --prompt="progress notes"

# End of day: Mark complete
task-master set-status --id=<id> --status=done
```

### Research-First Pattern

```bash
# Before implementing complex tasks
task-master expand --id=<id> --research

# Review research-backed subtasks
task-master show <id>

# Implement with confidence
```

## Phase B Usage

For Phase B node expansion, the PRD is already loaded:
```bash
# Generate Phase B tasks
task-master parse-prd .taskmaster/docs/phase-b-expansion.txt

# This creates tasks for:
# - 16 new node types (Geometric, Color, Motion, Composition)
# - 4 new intentional patterns (Aurora, Ember, Ocean, Forest)
# - Codegen enhancements
# - Documentation updates
```

## Maintenance

**Keep It Minimal:**
- Don't add complexity that doesn't serve the mission
- Periodically review tasks.json for bloat
- Delete completed tasks that no longer provide value
- Keep documentation concise

**What NOT to Add:**
- ❌ Heavyweight governance (ADRs, CANON, validation scripts)
- ❌ Multi-agent orchestration (this is a solo project)
- ❌ CI/CD pipelines (build system already exists)
- ❌ Detailed time tracking (focus on the work, not the metrics)

## Resources

**Taskmaster Documentation:**
- Official docs: https://docs.task-master.dev/
- CLI commands: https://docs.task-master.dev/capabilities/cli-root-commands
- MCP integration: https://docs.task-master.dev/capabilities/mcp

**K1.reinvented Project Docs:**
- README.md - Project overview and philosophy
- MISSION.md - Core principles and commitment
- START_HERE.md - Getting started guide
- docs/TEST_PATTERNS.md - Pattern documentation

---

**Remember:** Taskmaster is a tool to serve the mission, not the mission itself. If it ever feels like overhead, simplify it.

**Build something that matters. Build it true.**
