#!/usr/bin/env python3
"""
On-demand documentation housekeeping.
- Generates docs inventory and dashboard
- Runs frontmatter validation (informational by default)

Usage:
  python3 tools/src/docs_housekeeping.py [--strict] [--open]

Options:
  --strict  Exit non-zero if validation fails (default: non-blocking)
  --open    Open docs/Dashboard.md after generation (macOS only)
"""

import os
import sys
import subprocess
import shutil

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))

def run(cmd, cwd=ROOT, check=False):
    print(f"→ {cmd}")
    result = subprocess.run(cmd, cwd=cwd, shell=False)
    if check and result.returncode != 0:
        raise RuntimeError(f"Command failed: {' '.join(cmd)}")
    return result.returncode

def main():
    strict = '--strict' in sys.argv
    open_md = '--open' in sys.argv
    fix_frontmatter = '--fix-frontmatter' in sys.argv
    fix_frontmatter_dry = '--fix-frontmatter-dry-run' in sys.argv

    node = shutil.which('node')
    if not node:
        print("Warning: Node.js not found. Install Node 18+ to run inventory and dashboard.")
        print("You can still run validation, but inventory/dashboard require Node.")

    frontmatter_fix_rc = 0
    inventory_rc = 0
    dashboard_rc = 0
    tags_rc = 0
    index_badges_rc = 0
    index_summary_rc = 0
    dashboard_top_links_rc = 0
    validate_rc = 0

    try:
        if node:
            # Optional frontmatter fixer (run before generation)
            if fix_frontmatter or fix_frontmatter_dry:
                fixer_cmd = [node, os.path.join(ROOT, 'tools', 'src', 'docs-frontmatter-fix.js')]
                if fix_frontmatter_dry:
                    fixer_cmd.append('--dry-run')
                else:
                    fixer_cmd.append('--apply')
                frontmatter_fix_rc = run(fixer_cmd)

            inventory_rc = run([node, os.path.join(ROOT, 'tools', 'src', 'docs-inventory.js')])
            dashboard_rc = run([node, os.path.join(ROOT, 'tools', 'src', 'docs-dashboard.js')])
            # Inject global Top Links into the generated Dashboard
            dashboard_top_links_rc = run([node, os.path.join(ROOT, 'tools', 'src', 'docs-dashboard-top-links.js')])
            tags_rc = run([node, os.path.join(ROOT, 'tools', 'src', 'docs-tags.js')])
            index_badges_rc = run([node, os.path.join(ROOT, 'tools', 'src', 'docs-index-badges.js')])
            index_summary_rc = run([node, os.path.join(ROOT, 'tools', 'src', 'docs-index-summary.js')])
        else:
            print("Skipping inventory/dashboard generation due to missing Node.")
    except Exception as e:
        print(f"Error generating inventory/dashboard: {e}")

    try:
        validate_rc = run([shutil.which('node') or 'node', os.path.join(ROOT, 'tools', 'src', 'docs-frontmatter-check.js')])
    except Exception as e:
        print(f"Validation error: {e}")
        validate_rc = 1

    # Summary
    print("\nSummary:")
    if fix_frontmatter or fix_frontmatter_dry:
        print(f"- Frontmatter Fix: {'ok' if frontmatter_fix_rc == 0 else 'failed'} ({'dry-run' if fix_frontmatter_dry else 'applied'})")
    print(f"- Inventory: {'ok' if inventory_rc == 0 else 'failed'}")
    print(f"- Dashboard: {'ok' if dashboard_rc == 0 else 'failed'}")
    print(f"- Dashboard Top Links: {'ok' if dashboard_top_links_rc == 0 else 'skipped/failed'}")
    print(f"- Validation: {'ok' if validate_rc == 0 else 'issues found'}")
    print(f"- Tag pages: {'ok' if tags_rc == 0 else 'skipped/failed'}")
    print(f"- INDEX badges: {'ok' if index_badges_rc == 0 else 'skipped/failed'}")
    print(f"- INDEX summary: {'ok' if index_summary_rc == 0 else 'skipped/failed'}")

    # Optionally open Dashboard
    if open_md:
        dashboard_path = os.path.join(ROOT, 'docs', 'Dashboard.md')
        if os.path.exists(dashboard_path):
            if sys.platform == 'darwin':
                subprocess.run(['open', dashboard_path])
            else:
                print(f"Open the dashboard manually: {dashboard_path}")
        else:
            print("Dashboard not found; has inventory/dashboard generation run?")

    # Non-blocking by default; block only in --strict mode
    if strict and validate_rc != 0:
        sys.exit(1)
    sys.exit(0)

if __name__ == '__main__':
    main()
