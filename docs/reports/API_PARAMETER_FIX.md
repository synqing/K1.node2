---
title: K1.reinvented Web API Parameter Fix
status: draft
version: v1.0
owner: [Docs Maintainers]
reviewers: [Engineering Leads]
last_updated: 2025-10-28
next_review_due: 2026-01-26
tags: [docs]
related_docs: []
---
# K1.reinvented Web API Parameter Fix

## Issue
HTTP 400 was returned when parameters were clamped, but the parameters WERE successfully applied. This broke UI expectations which treated 400 as an error.

## Solution
Changed parameter clamping to return HTTP 200 with a `clamped` flag in the response instead of 400.

## Changes Made

### File: firmware/src/webserver.cpp

#### Change 1: POST /api/params Response (lines 116-141)

**Before:**
- `update_params_safe()` returns false if clamped
- API returned HTTP 400 on clamp with error message
- UI interprets 400 as failure even though parameters were applied

**After:**
- Always call `update_params_safe()` to apply parameters
- Always return HTTP 200 with structured response
- Include `clamped: true/false` flag in response body
- Include the final applied parameters in response

#### Change 2: Dashboard updateParams() function (lines 317-335)

**Before:**
- Did not check response status or content
- No user feedback on clamping

**After:**
- Checks the `clamped` flag in response
- Shows user-friendly alert if parameters were clamped
- Reloads parameters to show final values

## Example API Responses

### Success with no clamping
```json
{
  "success": true,
  "clamped": false,
  "params": {
    "speed": 2.5,
    "brightness": 0.5,
    "palette_id": 3,
    "palette_shift": 0.25,
    "beat_sensitivity": 1.2,
    "spectrum_low": 0.6,
    "spectrum_mid": 0.5,
    "spectrum_high": 0.4,
    "custom_param_1": 0.7,
    "custom_param_2": 0.3,
    "custom_param_3": 0.5
  }
}
```

### Success with clamping (values out of range)
Request:
```json
{
  "speed": 15.0,
  "brightness": 1.5,
  "palette_id": 10
}
```

Response (HTTP 200):
```json
{
  "success": true,
  "clamped": true,
  "params": {
    "speed": 10.0,
    "brightness": 1.0,
    "palette_id": 0,
    "palette_shift": 0.0,
    "beat_sensitivity": 1.0,
    "spectrum_low": 0.5,
    "spectrum_mid": 0.5,
    "spectrum_high": 0.5,
    "custom_param_1": 0.5,
    "custom_param_2": 0.5,
    "custom_param_3": 0.5
  }
}
```

### Error with invalid JSON (still HTTP 400)
Request:
```
{invalid json}
```

Response (HTTP 400):
```json
{
  "error": "Invalid JSON"
}
```

## Key Design Decisions

1. **Always return 200 for valid operations**: Even if values were clamped, the operation was successful - the parameters were applied at their safe ranges.

2. **Clamped flag separates status from outcome**: The `clamped` flag informs the UI about what happened without misleading HTTP status codes.

3. **Include final parameters in response**: UI can immediately reflect the actual values without needing a follow-up GET request.

4. **User-friendly alert on clamp**: Dashboard shows helpful message when values are adjusted, improving user awareness.

5. **Minimal schema change**: Added two fields (`success`, `clamped`) to response; all parameter content unchanged.

## Testing the Fix

### Test Case 1: Valid parameters within range
```bash
curl -X POST http://device.local/api/params \
  -H "Content-Type: application/json" \
  -d '{"speed": 2.0, "brightness": 0.7}'
```
Expected: HTTP 200, `clamped: false`

### Test Case 2: Out-of-range parameters
```bash
curl -X POST http://device.local/api/params \
  -H "Content-Type: application/json" \
  -d '{"speed": 25.0, "brightness": 2.0}'
```
Expected: HTTP 200, `clamped: true`, speed clamped to 10.0, brightness clamped to 1.0

### Test Case 3: Invalid JSON
```bash
curl -X POST http://device.local/api/params \
  -H "Content-Type: application/json" \
  -d '{invalid}'
```
Expected: HTTP 400, error message

### Test Case 4: Dashboard submit with clamping
- Open dashboard at `http://device.local/`
- Set Speed slider to max (10.0) and try typing higher value
- Click "Apply Parameters"
- Expected: Alert shows "Parameters were clamped to valid ranges"

## Compilation Status
Firmware compiled successfully with no errors or warnings.
