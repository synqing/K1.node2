# Taskmaster Quickstart for K1.reinvented

## 30-Second Setup

```bash
cd /Users/spectrasynq/Workspace_Management/Software/K1.reinvented

# 1. Add API keys to .env (if not already set)
cat > .env << 'EOF'
ANTHROPIC_API_KEY=your_key_here
PERPLEXITY_API_KEY=your_key_here
OPENAI_API_KEY=your_key_here
EOF

# 2. Generate Phase B tasks
task-master parse-prd .taskmaster/docs/phase-b-expansion.txt

# 3. Start working
task-master next
```

## Common Commands

```bash
# View all tasks
task-master list

# Get next available task
task-master next

# Show task details
task-master show 1.2

# Mark as in-progress
task-master set-status --id=1.2 --status=in-progress

# Add implementation notes
task-master update-subtask --id=1.2 --prompt="Implemented radial node, verified 450+ FPS"

# Mark as done
task-master set-status --id=1.2 --status=done
```

## Phase B Workflow

**Step 1: Generate Tasks**
```bash
task-master parse-prd .taskmaster/docs/phase-b-expansion.txt
```

**Step 2: Optional - Expand Complex Tasks**
```bash
# Break down a complex task into subtasks
task-master expand --id=1 --research

# Or expand all at once
task-master expand --all --research
```

**Step 3: Daily Development**
```bash
# Morning: Get next task
task-master next

# During work: Update progress
task-master update-subtask --id=<id> --prompt="progress notes"

# End of day: Mark complete
task-master set-status --id=<id> --status=done
```

## MCP Integration (Optional)

For Claude Desktop/Cursor:

Create `.mcp.json` in project root:
```json
{
  "mcpServers": {
    "task-master-ai": {
      "command": "npx",
      "args": ["-y", "task-master-ai"],
      "env": {
        "TASK_MASTER_TOOLS": "core",
        "ANTHROPIC_API_KEY": "your_key_here",
        "PERPLEXITY_API_KEY": "your_key_here"
      }
    }
  }
}
```

## Tips

**Stay Minimal:**
- Don't overthink task management
- Focus on the work, not the system
- If Taskmaster feels like overhead, simplify

**Align with Philosophy:**
- Every task should serve beauty
- Delete tasks that don't serve the mission
- Keep the system as minimal as the code

**Research-First:**
- Use `--research` flag for complex technical decisions
- Perplexity AI provides evidence-based guidance
- Better to research 10 minutes than implement wrong for 2 hours

---

**Build something that matters. Build it true.**
