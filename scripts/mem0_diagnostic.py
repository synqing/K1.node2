#!/usr/bin/env python3
"""
Mem0 SaaS Diagnostic - Inspect what memories exist
"""

import os
from mem0 import MemoryClient

api_key = os.getenv("MEM0_API_KEY")
if not api_key:
    print("✗ MEM0_API_KEY not set")
    exit(1)

memory = MemoryClient(api_key=api_key)
user_id = "k1_reinvented_project"

print("=== Mem0 SaaS Diagnostic ===\n")

# Try different API methods to find memories
print("1. Testing get_all() with filters:")
try:
    filters = {"user_id": user_id}
    result = memory.get_all(filters=filters)
    print(f"  Type: {type(result)}")
    print(f"  Content: {result}")
    if isinstance(result, dict):
        print(f"  Keys: {result.keys()}")
        if 'results' in result:
            print(f"  Results count: {len(result['results'])}")
except Exception as e:
    print(f"  ✗ Error: {e}")

print("\n2. Testing search() with broad query:")
try:
    filters = {"user_id": user_id}
    result = memory.search(query="K1", filters=filters, limit=20)
    print(f"  Type: {type(result)}")
    print(f"  Length: {len(result) if isinstance(result, list) else 'N/A'}")
    if result:
        print(f"  First result keys: {result[0].keys() if isinstance(result, list) else result.keys()}")
        print(f"  First result: {result[0] if isinstance(result, list) else result}")
except Exception as e:
    print(f"  ✗ Error: {e}")

print("\n3. Testing with different user_id (maybe bootstrap used different ID):")
test_ids = ["k1_reinvented_project", "k1", "default", "user"]
for test_id in test_ids:
    try:
        filters = {"user_id": test_id}
        result = memory.search(query="architecture", filters=filters, limit=5)
        if result:
            print(f"  ✓ Found memories with user_id='{test_id}': {len(result)} results")
            break
    except:
        continue
else:
    print("  ✗ No memories found with any test user_id")

print("\n✓ Diagnostic complete")
