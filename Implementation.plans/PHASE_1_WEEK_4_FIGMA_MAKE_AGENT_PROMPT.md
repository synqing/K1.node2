---
title: Phase 1 Week 4: Figma Make Agent Automation Prompt
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [plan]
related_docs: []
---
# Phase 1 Week 4: Figma Make Agent Automation Prompt

**Purpose**: Enable Figma Make automation to implement Phase 1 Week 4 responsive design & visual feedback components without manual UI work.

**Make Agent Capability Level**: Expert (Figma API, component variants, constraints, design tokens, batch operations)

**Target Figma File**: K1 Control App Design System (must exist before running Make scenario)

**Estimated Make Automation Time**: 3–4 hours of scenario execution (parallel where possible)

---

## Part 1: Make Agent Context & Prerequisites

### 1.1 Required Figma Setup
Before running the Make scenario, your Figma file must have:

```json
{
  "figma_file_structure": {
    "pages": [
      {
        "name": "🎯 Design System",
        "sections": [
          "Colors & Tokens",
          "Typography",
          "Components Library",
          "Responsive Grid"
        ]
      },
      {
        "name": "🚀 Phase 1 Week 4 - Responsive & Feedback",
        "sections": [
          "Mobile (< 640px)",
          "Tablet (640–1023px)",
          "Desktop (≥ 1024px)",
          "Visual Feedback Components",
          "Touch Interactions"
        ]
      }
    ]
  },
  "required_color_tokens": {
    "--k1-bg": "#0F0F0F",
    "--k1-surface": "#1A1A1A",
    "--k1-border": "#2A2A2A",
    "--k1-accent": "#00D9FF",
    "--k1-accent-light": "#4DFFFF",
    "--k1-text": "#FFFFFF",
    "--k1-text-secondary": "#B3B3B3",
    "--k1-error": "#FF4444",
    "--k1-error-light": "#FF8888",
    "--k1-success": "#44FF44",
    "--k1-warning": "#FFAA44"
  }
}
```

### 1.2 Make Modules Required
Your Make scenario must include these Figma-capable modules:
- **Figma > API Request** (for component operations)
- **Figma > Get File** (source data)
- **Figma > Update Component** (bulk updates)
- **Array/Object Iterator** (loop through components)
- **Router** (conditional logic for breakpoints)
- **Aggregator** (collect results, error handling)

### 1.3 Authentication
- Figma API token required in Make connection
- File ID from K1 Control App Design System Figma file
- Workspace admin permissions needed

---

## Part 2: Component Definitions & Make Operations

### 2.1 TopNav.tsx Responsive Transformation

**Target Component**: TopNav (existing in Figma library)

**Make Workflow - Phase 1: Desktop Variant**

```json
{
  "operation": "Create_Component_Variant",
  "component_name": "TopNav",
  "variant_name": "Desktop",
  "width": 1920,
  "height": 64,
  "layout": {
    "type": "flex",
    "direction": "horizontal",
    "spacing": 24,
    "padding": {"top": 12, "right": 24, "bottom": 12, "left": 24},
    "align_items": "center",
    "justify_content": "space-between"
  },
  "children": [
    {
      "type": "Frame",
      "name": "Logo",
      "width": 48,
      "height": 48,
      "constraints": {
        "horizontal": "scale",
        "vertical": "scale"
      }
    },
    {
      "type": "Frame",
      "name": "NavTabs",
      "width": "auto",
      "height": 40,
      "layout": {
        "type": "flex",
        "direction": "horizontal",
        "spacing": 4,
        "wrap": false
      },
      "children": [
        {
          "type": "Component",
          "name": "NavTab",
          "width": 120,
          "fill_color": "var(--k1-bg)",
          "constraints": {"horizontal": "scale", "vertical": "scale"}
        }
      ],
      "repeat_count": 5,
      "repeat_spacing": 4
    },
    {
      "type": "Frame",
      "name": "StatusBadge",
      "width": 160,
      "height": 40,
      "fill_color": "var(--k1-surface)",
      "border_color": "var(--k1-border)",
      "border_width": 1,
      "border_radius": 8
    }
  ]
}
```

**Make Workflow - Phase 2: Tablet Variant**

```json
{
  "operation": "Create_Component_Variant",
  "component_name": "TopNav",
  "variant_name": "Tablet",
  "width": 1024,
  "height": 56,
  "layout": {
    "type": "flex",
    "direction": "horizontal",
    "spacing": 16,
    "padding": {"top": 8, "right": 16, "bottom": 8, "left": 16},
    "align_items": "center",
    "justify_content": "space-between"
  },
  "modifications": [
    {
      "target": "NavTabs",
      "width": "auto",
      "children_count": 3,
      "children": [
        {"name": "Dashboard", "width": 100},
        {"name": "Settings", "width": 80},
        {"name": "Help", "width": 60}
      ]
    },
    {
      "target": "StatusBadge",
      "width": 120,
      "height": 36,
      "hide_label": false
    }
  ]
}
```

**Make Workflow - Phase 3: Mobile Variant (Hamburger Menu)**

```json
{
  "operation": "Create_Component_Variant",
  "component_name": "TopNav",
  "variant_name": "Mobile",
  "width": 375,
  "height": 48,
  "layout": {
    "type": "flex",
    "direction": "horizontal",
    "spacing": 8,
    "padding": {"top": 8, "right": 12, "bottom": 8, "left": 12},
    "align_items": "center",
    "justify_content": "space-between"
  },
  "modifications": [
    {
      "target": "Logo",
      "width": 36,
      "height": 36
    },
    {
      "target": "NavTabs",
      "hide": true
    },
    {
      "type": "Component",
      "name": "HamburgerButton",
      "width": 40,
      "height": 40,
      "component_key": "HamburgerIcon",
      "constraints": {"horizontal": "max", "vertical": "center"},
      "insert_at": "end"
    },
    {
      "target": "StatusBadge",
      "hide": true
    }
  ]
}
```

**Make Error Handling**:
```json
{
  "error_handling": {
    "on_variant_exists": "update_existing",
    "on_component_missing": {
      "action": "create_component",
      "template": "TopNav_Base",
      "log": true,
      "fail_scenario": false
    },
    "on_layout_conflict": {
      "action": "report_conflict",
      "field": "component_name",
      "notify": true
    }
  }
}
```

---

### 2.2 Sidebar.tsx Responsive Transformation

**Target Component**: Sidebar

**Make Workflow - Desktop (Always Visible)**

```json
{
  "operation": "Create_Component_Variant",
  "component_name": "Sidebar",
  "variant_name": "Desktop",
  "width": 280,
  "height": "auto",
  "layout": {
    "type": "flex",
    "direction": "vertical",
    "spacing": 12,
    "padding": 16,
    "align_items": "stretch",
    "justify_content": "flex-start"
  },
  "constraints": {
    "horizontal": "fixed",
    "vertical": "scale"
  },
  "children": [
    {
      "type": "Frame",
      "name": "SectionHeader",
      "height": 32,
      "text_color": "var(--k1-text-secondary)",
      "font_size": 12,
      "font_weight": 600
    },
    {
      "type": "Component",
      "name": "SidebarItem",
      "width": "100%",
      "height": 44,
      "padding": {"left": 12, "right": 12},
      "repeat_count": 8,
      "repeat_spacing": 4
    }
  ]
}
```

**Make Workflow - Tablet/Mobile (Drawer Pattern)**

```json
{
  "operation": "Create_Component_Variant",
  "component_name": "Sidebar",
  "variant_name": "Mobile_Drawer",
  "width": 280,
  "height": "100vh",
  "position": "fixed",
  "left": 0,
  "top": 48,
  "z_index": 1000,
  "layout": {
    "type": "flex",
    "direction": "vertical",
    "spacing": 12,
    "padding": 16,
    "overflow": "scroll"
  },
  "background": "var(--k1-surface)",
  "shadow": {
    "type": "drop",
    "x": 2,
    "y": 0,
    "blur": 8,
    "spread": 0,
    "color": "rgba(0,0,0,0.3)"
  },
  "modifications": [
    {
      "operation": "Add_Close_Button",
      "name": "CloseDrawer",
      "width": 32,
      "height": 32,
      "position": "absolute",
      "top": 12,
      "right": 12,
      "component_key": "IconClose"
    }
  ]
}
```

**Make Batch Operation - Hide/Show for Breakpoints**:

```json
{
  "operation": "Configure_Visibility_Rules",
  "component": "Sidebar",
  "visibility_triggers": [
    {
      "breakpoint": "desktop",
      "min_width": 1024,
      "variant": "Desktop",
      "visible": true,
      "position": "sticky"
    },
    {
      "breakpoint": "tablet",
      "min_width": 640,
      "max_width": 1023,
      "variant": "Mobile_Drawer",
      "visible": "toggle_controlled",
      "trigger_element": "HamburgerButton"
    },
    {
      "breakpoint": "mobile",
      "max_width": 639,
      "variant": "Mobile_Drawer",
      "visible": "toggle_controlled",
      "trigger_element": "HamburgerButton"
    }
  ]
}
```

---

### 2.3 EffectSelector.tsx Grid Responsiveness

**Make Workflow - Create Responsive Grid**

```json
{
  "operation": "Create_Component_Variant",
  "component_name": "EffectSelector",
  "variants": {
    "Desktop": {
      "width": 1200,
      "grid": {
        "type": "grid",
        "columns": 8,
        "rows": "auto",
        "column_gap": 12,
        "row_gap": 12,
        "padding": 16
      },
      "item_width": 140,
      "item_height": 120,
      "item_count": 24
    },
    "Tablet": {
      "width": 768,
      "grid": {
        "type": "grid",
        "columns": 4,
        "rows": "auto",
        "column_gap": 10,
        "row_gap": 10,
        "padding": 12
      },
      "item_width": 140,
      "item_height": 120,
      "item_count": 24
    },
    "Mobile": {
      "width": 360,
      "grid": {
        "type": "grid",
        "columns": 2,
        "rows": "auto",
        "column_gap": 8,
        "row_gap": 8,
        "padding": 8
      },
      "item_width": 140,
      "item_height": 120,
      "item_count": 24
    }
  }
}
```

**Make Operation - Inject Effect Data into Grid**:

```json
{
  "operation": "Populate_Grid_Items",
  "component": "EffectSelector",
  "data_source": {
    "type": "array",
    "items": [
      {
        "id": 1,
        "name": "Ambient",
        "thumbnail": "effect_ambient.svg",
        "color_accent": "var(--k1-accent)"
      },
      {
        "id": 2,
        "name": "Pulse",
        "thumbnail": "effect_pulse.svg",
        "color_accent": "var(--k1-accent)"
      }
    ],
    "count": 24
  },
  "template_component": "EffectGridItem",
  "batch_operations": {
    "apply_to_all": [
      {
        "field": "corners_rounded",
        "value": 8
      },
      {
        "field": "border_width",
        "value": 1
      },
      {
        "field": "border_color",
        "value": "var(--k1-border)"
      },
      {
        "field": "hover_state_shadow",
        "value": "0 4px 12px rgba(0, 217, 255, 0.2)"
      }
    ]
  }
}
```

---

### 2.4 EffectParameters.tsx Responsive Layout

**Make Workflow - Create Layout Variants**

```json
{
  "operation": "Create_Component_Variants",
  "component_name": "EffectParameters",
  "variants": [
    {
      "name": "Desktop",
      "width": 600,
      "layout": {
        "type": "flex",
        "direction": "vertical",
        "spacing": 16,
        "padding": 20
      },
      "sections": [
        {
          "name": "Parameter_A",
          "width": "100%",
          "layout": {"direction": "horizontal", "spacing": 12},
          "children": [
            {"type": "Label", "width": 120},
            {"type": "Slider", "width": "auto", "flex": 1},
            {"type": "Value", "width": 60}
          ]
        },
        {
          "name": "Parameter_B",
          "width": "100%",
          "layout": {"direction": "horizontal", "spacing": 12},
          "children": [
            {"type": "Label", "width": 120},
            {"type": "Slider", "width": "auto", "flex": 1},
            {"type": "Value", "width": 60}
          ]
        }
      ]
    },
    {
      "name": "Mobile",
      "width": 360,
      "layout": {
        "type": "flex",
        "direction": "vertical",
        "spacing": 12,
        "padding": 12
      },
      "sections": [
        {
          "name": "Parameter_A",
          "width": "100%",
          "layout": {"direction": "vertical", "spacing": 8},
          "children": [
            {"type": "Label", "width": "100%"},
            {"type": "Slider", "width": "100%"},
            {"type": "Value", "width": 50, "align": "right"}
          ]
        }
      ]
    }
  ]
}
```

**Make Operation - Add Loading/Success States**:

```json
{
  "operation": "Add_Component_States",
  "component": "EffectParameters",
  "states": [
    {
      "name": "loading",
      "modifications": [
        {
          "target": "Sliders",
          "opacity": 0.5,
          "pointer_events": "none"
        },
        {
          "target": "LoadingSpinner",
          "visible": true
        }
      ]
    },
    {
      "name": "success",
      "duration_ms": 2000,
      "modifications": [
        {
          "target": "SuccessCheckmark",
          "visible": true,
          "animation": "fade_in_scale"
        }
      ],
      "then": {
        "action": "revert_to_default",
        "delay_ms": 2000
      }
    }
  ]
}
```

---

### 2.5 Visual Feedback Components (NEW)

**Make Operation - Create LoadingSpinner Component**

```json
{
  "operation": "Create_Component",
  "component_name": "LoadingSpinner",
  "width": 40,
  "height": 40,
  "layout": {
    "type": "flex",
    "direction": "horizontal",
    "align_items": "center",
    "justify_content": "center"
  },
  "children": [
    {
      "type": "Ellipse",
      "width": 40,
      "height": 40,
      "fill": "none",
      "stroke_width": 3,
      "stroke_color": "var(--k1-accent)",
      "opacity": 0.2
    },
    {
      "type": "Ellipse",
      "width": 40,
      "height": 40,
      "fill": "none",
      "stroke_width": 3,
      "stroke_color": "var(--k1-accent)",
      "stroke_dasharray": "31.4 62.8",
      "animation": {
        "type": "spin",
        "duration": 1000,
        "infinite": true,
        "easing": "linear"
      }
    }
  ]
}
```

**Make Operation - Create SkeletonScreen Component**

```json
{
  "operation": "Create_Component",
  "component_name": "SkeletonScreen",
  "width": 600,
  "height": 400,
  "layout": {
    "type": "flex",
    "direction": "vertical",
    "spacing": 12,
    "padding": 16
  },
  "children": [
    {
      "type": "Rectangle",
      "name": "SkeletonLine_1",
      "width": 200,
      "height": 24,
      "fill_color": "var(--k1-surface)",
      "border_radius": 6,
      "animation": {
        "type": "pulse",
        "duration": 1200,
        "infinite": true,
        "opacity_range": [0.5, 1.0]
      }
    },
    {
      "type": "Rectangle",
      "name": "SkeletonLine_2",
      "width": "100%",
      "height": 16,
      "fill_color": "var(--k1-surface)",
      "border_radius": 6,
      "repeat_count": 3,
      "repeat_spacing": 8,
      "animation": {
        "type": "pulse",
        "duration": 1200,
        "infinite": true,
        "opacity_range": [0.5, 1.0]
      }
    }
  ]
}
```

**Make Operation - Create EmptyState Component**

```json
{
  "operation": "Create_Component",
  "component_name": "EmptyState",
  "width": 300,
  "height": 400,
  "layout": {
    "type": "flex",
    "direction": "vertical",
    "spacing": 16,
    "padding": 24,
    "align_items": "center",
    "justify_content": "center"
  },
  "children": [
    {
      "type": "Component",
      "name": "IconEmpty",
      "component_key": "IconAlert",
      "width": 80,
      "height": 80,
      "fill_color": "var(--k1-text-secondary)"
    },
    {
      "type": "Text",
      "name": "Title",
      "content": "No Effects Found",
      "font_size": 18,
      "font_weight": 600,
      "fill_color": "var(--k1-text)"
    },
    {
      "type": "Text",
      "name": "Description",
      "content": "Try adjusting your search or add a new effect.",
      "font_size": 14,
      "fill_color": "var(--k1-text-secondary)",
      "text_align": "center"
    },
    {
      "type": "Component",
      "name": "ActionButton",
      "component_key": "Button_Primary",
      "width": 160,
      "height": 40
    }
  ]
}
```

**Make Operation - Create SuccessCheckmark Component**

```json
{
  "operation": "Create_Component",
  "component_name": "SuccessCheckmark",
  "width": 60,
  "height": 60,
  "layout": {
    "type": "flex",
    "direction": "horizontal",
    "align_items": "center",
    "justify_content": "center"
  },
  "children": [
    {
      "type": "Circle",
      "width": 60,
      "height": 60,
      "fill_color": "none",
      "stroke_color": "var(--k1-success)",
      "stroke_width": 2,
      "animation": {
        "type": "scale",
        "duration": 400,
        "from": 0.3,
        "to": 1.0,
        "easing": "cubic-bezier(0.34, 1.56, 0.64, 1)"
      }
    },
    {
      "type": "Path",
      "name": "Checkmark",
      "d": "M 18 32 L 26 40 L 42 24",
      "stroke_color": "var(--k1-success)",
      "stroke_width": 3,
      "fill": "none",
      "stroke_linecap": "round",
      "stroke_linejoin": "round",
      "animation": {
        "type": "stroke_dash",
        "duration": 400,
        "delay": 100,
        "stroke_dasharray": 50,
        "stroke_dashoffset": "50→0"
      }
    }
  ]
}
```

---

### 2.6 ColorManagement.tsx Responsive Sections

**Make Workflow - Create Responsive Color Sections**

```json
{
  "operation": "Create_Component_Variant",
  "component_name": "ColorManagement",
  "variant_name": "Desktop",
  "width": 800,
  "layout": {
    "type": "flex",
    "direction": "horizontal",
    "spacing": 24,
    "padding": 20
  },
  "children": [
    {
      "type": "Frame",
      "name": "PaletteSection",
      "width": 350,
      "flex": 0,
      "layout": {"direction": "vertical", "spacing": 12}
    },
    {
      "type": "Frame",
      "name": "ColorGridSection",
      "width": "auto",
      "flex": 1,
      "layout": {"direction": "vertical", "spacing": 12}
    }
  ]
}
```

```json
{
  "operation": "Create_Component_Variant",
  "component_name": "ColorManagement",
  "variant_name": "Mobile",
  "width": 360,
  "layout": {
    "type": "flex",
    "direction": "vertical",
    "spacing": 16,
    "padding": 12,
    "overflow_y": "scroll"
  },
  "children": [
    {
      "type": "Frame",
      "name": "PaletteSection",
      "width": "100%",
      "layout": {"direction": "vertical", "spacing": 12}
    },
    {
      "type": "Divider",
      "width": "100%",
      "height": 1,
      "fill_color": "var(--k1-border)"
    },
    {
      "type": "Frame",
      "name": "ColorGridSection",
      "width": "100%",
      "layout": {"direction": "vertical", "spacing": 12}
    }
  ]
}
```

---

## Part 3: Touch Interaction & Accessibility Tokens

### 3.1 Touch Target Sizing

**Make Operation - Apply Touch Standards**

```json
{
  "operation": "Configure_Touch_Targets",
  "rules": [
    {
      "component_type": "Button",
      "min_width": 44,
      "min_height": 44,
      "padding": {"horizontal": 12, "vertical": 10},
      "apply_to_all": true
    },
    {
      "component_type": "IconButton",
      "min_width": 44,
      "min_height": 44,
      "apply_to_all": true
    },
    {
      "component_type": "Slider",
      "hit_area_height": 44,
      "hit_area_padding": 8,
      "apply_to_all": true
    },
    {
      "component_type": "GridItem",
      "min_tap_spacing": 8,
      "apply_to_all": true
    }
  ],
  "mobile_breakpoints": {
    "all_components": {
      "extra_padding": 4,
      "apply_to_max_width": 640
    }
  }
}
```

### 3.2 Accessibility Token Injection

**Make Operation - Apply ARIA & A11y Attributes**

```json
{
  "operation": "Configure_Accessibility",
  "components": [
    {
      "component_name": "Button",
      "attributes": {
        "role": "button",
        "aria_label": "auto_from_text_content",
        "aria_disabled": "bound_to_disabled_state",
        "keyboard_accessible": true
      }
    },
    {
      "component_name": "Slider",
      "attributes": {
        "role": "slider",
        "aria_valuenow": "bound_to_value",
        "aria_valuemin": "bound_to_min",
        "aria_valuemax": "bound_to_max",
        "aria_label": "auto_from_label_text"
      }
    },
    {
      "component_name": "IconButton",
      "attributes": {
        "aria_label": "required",
        "aria_hidden_icon": true,
        "keyboard_accessible": true
      }
    }
  ],
  "color_contrast_check": {
    "enabled": true,
    "min_ratio": 4.5,
    "report_failures": true
  }
}
```

---

## Part 4: Make Scenario Workflow & Sequencing

### 4.1 Execution Order (Critical for Dependencies)

The Make scenario MUST execute operations in this order to avoid component reference errors:

```json
{
  "scenario_phases": [
    {
      "phase": 1,
      "name": "Create_Base_Components",
      "description": "Create all new components (LoadingSpinner, SkeletonScreen, EmptyState, SuccessCheckmark)",
      "operations": [
        "Create_Component(LoadingSpinner)",
        "Create_Component(SkeletonScreen)",
        "Create_Component(EmptyState)",
        "Create_Component(SuccessCheckmark)"
      ],
      "timeout_sec": 30,
      "error_handling": "fail_entire_phase"
    },
    {
      "phase": 2,
      "name": "Create_Responsive_Variants",
      "description": "Create Desktop/Tablet/Mobile variants for existing components",
      "operations": [
        "Create_Component_Variant(TopNav, Desktop)",
        "Create_Component_Variant(TopNav, Tablet)",
        "Create_Component_Variant(TopNav, Mobile)",
        "Create_Component_Variant(Sidebar, Desktop)",
        "Create_Component_Variant(Sidebar, Mobile_Drawer)",
        "Create_Component_Variant(EffectSelector, Desktop|Tablet|Mobile)",
        "Create_Component_Variant(EffectParameters, Desktop|Mobile)",
        "Create_Component_Variant(ColorManagement, Desktop|Mobile)"
      ],
      "parallel": true,
      "max_concurrent": 3,
      "timeout_sec": 60
    },
    {
      "phase": 3,
      "name": "Configure_Component_States",
      "description": "Add interactive states (loading, success, disabled) to variants",
      "operations": [
        "Add_Component_States(EffectParameters, loading|success)",
        "Configure_Visibility_Rules(Sidebar, breakpoint_triggers)",
        "Configure_Touch_Targets(all_components)"
      ],
      "timeout_sec": 45
    },
    {
      "phase": 4,
      "name": "Populate_Data_&_Assets",
      "description": "Inject design tokens, colors, and effect grid data",
      "operations": [
        "Populate_Grid_Items(EffectSelector)",
        "Apply_Design_Tokens(all_components)",
        "Configure_Accessibility(all_components)"
      ],
      "timeout_sec": 30
    },
    {
      "phase": 5,
      "name": "Validation_&_Cleanup",
      "description": "Verify all components exist, check constraints, generate report",
      "operations": [
        "Verify_All_Variants_Created",
        "Check_Design_Token_Coverage",
        "Generate_Completion_Report",
        "Create_Summary_Sheet"
      ],
      "timeout_sec": 20
    }
  ],
  "total_estimated_time": "4 hours"
}
```

### 4.2 Error Handling & Rollback Strategy

```json
{
  "error_handling": {
    "on_phase_failure": {
      "phase_1": "STOP_ALL → Verify components created manually → Resume from phase_2",
      "phase_2": "STOP_ALL → Check variant names for conflicts → Resume",
      "phase_3": "CONTINUE_ON_ERROR → Log failed states → Complete phases 4-5 → Report failures",
      "phase_4": "CONTINUE_ON_ERROR → Skip missing design tokens → Complete phase 5 → Report gaps",
      "phase_5": "CONTINUE → No rollback needed (validation only)"
    },
    "retry_policy": {
      "max_retries": 2,
      "backoff_ms": 500,
      "apply_to_phases": [1, 2, 3]
    },
    "logging": {
      "log_all_operations": true,
      "log_timestamps": true,
      "export_format": "JSON",
      "export_path": "/Make_Logs/Phase1_Week4_Execution.json"
    }
  }
}
```

---

## Part 5: Data Templates & Bulk Operations

### 5.1 Effect Grid Data Template

```json
{
  "effects_data": [
    {
      "id": 1,
      "name": "Ambient",
      "category": "Base",
      "description": "Soft, continuous color wash",
      "thumbnail_key": "effect_ambient",
      "preview_color": "#00D9FF",
      "grid_position": [0, 0]
    },
    {
      "id": 2,
      "name": "Pulse",
      "category": "Dynamic",
      "description": "Rhythmic color breathing",
      "thumbnail_key": "effect_pulse",
      "preview_color": "#00D9FF",
      "grid_position": [1, 0]
    },
    {
      "id": 3,
      "name": "Spectrum",
      "category": "Audio",
      "description": "Real-time audio spectrum visualizer",
      "thumbnail_key": "effect_spectrum",
      "preview_color": "#4DFFFF",
      "grid_position": [2, 0]
    }
  ],
  "template_component": "EffectGridItem",
  "grid_config": {
    "desktop": {"columns": 8, "spacing": 12},
    "tablet": {"columns": 4, "spacing": 10},
    "mobile": {"columns": 2, "spacing": 8}
  }
}
```

### 5.2 Design Token Injection Template

```json
{
  "design_tokens": {
    "colors": {
      "primary": {
        "name": "--k1-accent",
        "value": "#00D9FF",
        "apply_to": ["buttons", "links", "highlights", "focus_states"]
      },
      "background": {
        "name": "--k1-bg",
        "value": "#0F0F0F",
        "apply_to": ["page_background", "overlays"]
      },
      "surface": {
        "name": "--k1-surface",
        "value": "#1A1A1A",
        "apply_to": ["cards", "panels", "modals"]
      }
    },
    "typography": {
      "heading_1": {"size": 32, "weight": 700, "line_height": 1.2},
      "heading_2": {"size": 24, "weight": 600, "line_height": 1.3},
      "body": {"size": 14, "weight": 400, "line_height": 1.5},
      "caption": {"size": 12, "weight": 500, "line_height": 1.4}
    },
    "spacing": {
      "xs": 4,
      "sm": 8,
      "md": 12,
      "lg": 16,
      "xl": 24,
      "xxl": 32
    }
  },
  "batch_apply": {
    "scope": "all_components",
    "override_existing": false,
    "log_changes": true
  }
}
```

---

## Part 6: Validation & Success Criteria

### 6.1 Make Scenario Checkpoints

After each phase, the Make scenario MUST verify:

```json
{
  "validation_checkpoints": {
    "phase_1": {
      "checkpoint": "Components Created",
      "checks": [
        {"component": "LoadingSpinner", "must_exist": true},
        {"component": "SkeletonScreen", "must_exist": true},
        {"component": "EmptyState", "must_exist": true},
        {"component": "SuccessCheckmark", "must_exist": true}
      ],
      "success_criteria": "ALL 4 components exist in Figma file"
    },
    "phase_2": {
      "checkpoint": "Responsive Variants Created",
      "checks": [
        {"component": "TopNav", "variants": ["Desktop", "Tablet", "Mobile"], "all_required": true},
        {"component": "Sidebar", "variants": ["Desktop", "Mobile_Drawer"], "all_required": true},
        {"component": "EffectSelector", "variants": ["Desktop", "Tablet", "Mobile"], "all_required": true},
        {"component": "EffectParameters", "variants": ["Desktop", "Mobile"], "all_required": true}
      ],
      "success_criteria": "All required variants exist with no naming conflicts"
    },
    "phase_3": {
      "checkpoint": "States & Interactions Configured",
      "checks": [
        {"component": "EffectParameters", "states": ["loading", "success"], "all_required": true},
        {"component": "Sidebar", "visibility_rules": "configured", "requires": true},
        {"component": "all_buttons", "touch_target_height": 44, "min_required": true}
      ],
      "success_criteria": "All states and interactions functional in Figma"
    },
    "phase_4": {
      "checkpoint": "Data & Tokens Populated",
      "checks": [
        {"grid": "EffectSelector", "item_count": 24, "exact_required": true},
        {"tokens": "design_system", "color_tokens": 11, "min_required": true},
        {"accessibility": "all_components", "aria_coverage": 0.95, "min_required": true}
      ],
      "success_criteria": "All grids populated, tokens applied, accessibility > 95%"
    },
    "phase_5": {
      "checkpoint": "Final Validation",
      "report_contents": [
        "Total components created: N",
        "Total variants created: N",
        "Total animations added: N",
        "Design token coverage: X%",
        "Accessibility compliance: X%",
        "Estimated React dev time: 2-3 hours"
      ]
    }
  }
}
```

### 6.2 Handoff Success Criteria

When Make scenario completes, the Figma file must have:

- ✓ All 4 new components (LoadingSpinner, SkeletonScreen, EmptyState, SuccessCheckmark)
- ✓ All 8 responsive component variants (TopNav×3, Sidebar×2, EffectSelector×3, EffectParameters×2, ColorManagement×2)
- ✓ 24 effect grid items populated in EffectSelector
- ✓ Touch targets ≥ 44px for all interactive elements
- ✓ Design tokens applied to all color/spacing values
- ✓ Accessibility attributes (ARIA labels, roles) present on 95%+ of components
- ✓ State animations (loading spin, success checkmark) configured and previewing
- ✓ Responsive breakpoints clearly marked (Mobile < 640px | Tablet 640–1023px | Desktop ≥ 1024px)

---

## Part 7: Make Scenario Template (Ready to Configure)

Below is a **Make HTTP Request structure** to execute each operation:

```json
{
  "make_module_1": {
    "module_type": "Figma > API Request",
    "endpoint": "/v1/files/{file_id}/components",
    "method": "POST",
    "auth": "Figma API Token",
    "request_body": {
      "operation": "create",
      "component": "{{phase_1_operations.0}}",
      "properties": {
        "name": "LoadingSpinner",
        "width": 40,
        "height": 40,
        "children": "{{spinner_children_json}}"
      }
    }
  },
  "make_iterator": {
    "module_type": "Array Iterator",
    "array": "{{all_operations}}",
    "iterate_over": "phase_2_operations",
    "concurrent_limit": 3
  },
  "make_error_handler": {
    "module_type": "Error Handler",
    "on_error": "log_to_sheet_and_continue"
  },
  "make_aggregator": {
    "module_type": "Aggregator",
    "aggregate_from": "all_modules",
    "final_report": {
      "total_operations": "{{module_result_count}}",
      "success_count": "{{successful_operations}}",
      "failed_operations": "{{failed_operations}}"
    }
  }
}
```

---

## Part 8: React Developer Handoff (Post-Make Completion)

After Make scenario finishes, the React developer receives:

1. **Updated Figma File** with all responsive components and states
2. **This Prompt Document** (copy to your project docs for reference)
3. **Success Report** (JSON export from Make scenario)
4. **Implementation Checklist**:
   - [ ] Review all Figma variants and states
   - [ ] Export responsive component specs (auto-generated from variants)
   - [ ] Update React component imports (new visual feedback components)
   - [ ] Connect React state to Figma loading/success states
   - [ ] Add responsive breakpoint media queries (reference Figma constraints)
   - [ ] Test touch interactions on mobile devices (validate 44px targets)
   - [ ] Run accessibility audit (WAVE, axe DevTools)
   - [ ] Verify performance (no new regressions, FPS stable at 60)

**Estimated React Dev Time**: 2–3 hours to wire Figma components into React

---

## Part 9: Troubleshooting Guide for Make Execution

| Error | Cause | Resolution |
|-------|-------|-----------|
| "Component not found" | Referenced component doesn't exist before variant creation | Check that base component created in Phase 1 before Phase 2 starts |
| "Invalid layout configuration" | Grid/flex layout parameters malformed | Validate JSON syntax, ensure all required fields present |
| "Design token not applied" | Token name doesn't match Figma token library | Map token names to actual Figma token library names |
| "Variant already exists" | Variant name conflicts with existing component | Rename variant (use suffix like `_V2`) or delete old variant first |
| "Rate limit exceeded" | Too many simultaneous API requests | Reduce `max_concurrent` in parallel operations (max 3 recommended) |
| "Authentication failed" | Figma API token expired or invalid | Refresh token in Make connection, reauthorize |
| "File permission denied" | API token lacks write permission | Ensure token has `files:write` scope |

---

## Appendix A: Command Reference for Make Modules

```
Operation Syntax Summary:

Create_Component(name, width, height, children[])
Create_Component_Variant(base_name, variant_name, modifications[])
Add_Component_States(component_name, states[{name, modifications, animation}])
Configure_Visibility_Rules(component_name, breakpoint_rules[])
Configure_Touch_Targets(rules[])
Populate_Grid_Items(component_name, data_source, template_component)
Apply_Design_Tokens(scope, token_map)
Configure_Accessibility(components[], attributes[])
Verify_All_Variants_Created()
Generate_Completion_Report()
```

---

## Appendix B: Example Make Scenario Screenshot Metadata

When the Make scenario runs, it should generate screenshots at key checkpoints:

```json
{
  "checkpoints": [
    {
      "phase": 1,
      "screenshot": "phase_1_components_created.png",
      "timestamp": "{{now()}}",
      "components_visible": 4
    },
    {
      "phase": 2,
      "screenshot": "phase_2_variants_created.png",
      "timestamp": "{{now()}}",
      "components_visible": 8,
      "breakpoints_marked": "yes"
    },
    {
      "phase": 5,
      "screenshot": "final_component_library.png",
      "timestamp": "{{now()}}",
      "summary_sheet_visible": "yes"
    }
  ]
}
```

---

**Document Status**: `published`
**Author**: Claude Agent
**Date**: 2025-10-27
**Intent**: Enable Make automation to execute Phase 1 Week 4 responsive design without manual Figma work
**Next Step**: Configure this prompt into Make scenario modules and execute Phase 1-5

