#!/usr/bin/env python3
"""
Inventory Alignment Check

Parses firmware route constants and handler registrations to validate that
docs/api/firmware_inventory.json includes all endpoints and methods.

Usage:
  python3 tools/scripts/inventory_check.py
Exit code:
  0 on success, 1 if missing entries are found.
"""
import json
import os
import re
import sys

REPO_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../"))
RATE_LIMITER = os.path.join(REPO_ROOT, "firmware/src/webserver_rate_limiter.h")
WEBSERVER = os.path.join(REPO_ROOT, "firmware/src/webserver.cpp")
INVENTORY = os.path.join(REPO_ROOT, "docs/api/firmware_inventory.json")

def parse_routes():
    with open(RATE_LIMITER, 'r') as f:
        text = f.read()
    # static const char* ROUTE_X = "/api/...";
    routes = {}
    for m in re.finditer(r'static const char\*\s+(ROUTE_[A-Z0-9_]+)\s*=\s*"([^"]+)";', text):
        routes[m.group(1)] = m.group(2)
    return routes

def parse_registrations():
    with open(WEBSERVER, 'r') as f:
        text = f.read()
    endpoints = []
    # registerGetHandler(server, ROUTE_X, ...)
    for m in re.finditer(r'registerGetHandler\(server,\s*(ROUTE_[A-Z0-9_]+),', text):
        endpoints.append(("GET", m.group(1)))
    # registerPostHandler(server, ROUTE_X, ...)
    for m in re.finditer(r'registerPostHandler\(server,\s*(ROUTE_[A-Z0-9_]+),', text):
        endpoints.append(("POST", m.group(1)))
    return endpoints

def load_inventory():
    with open(INVENTORY, 'r') as f:
        inv = json.load(f)
    paths = set()
    for item in inv.get('items', []):
        for ep in item.get('endpoints', []):
            paths.add((ep.get('method'), ep.get('path')))
    return paths

def main():
    routes = parse_routes()
    endpoints = parse_registrations()
    inventory_paths = load_inventory()

    missing = []
    for method, route_const in endpoints:
        path = routes.get(route_const)
        if not path:
            continue
        if (method, path) not in inventory_paths:
            missing.append((method, path))

    if missing:
        print("Missing endpoints in inventory:")
        for method, path in missing:
            print(f" - {method} {path}")
        sys.exit(1)
    else:
        print("Inventory aligned: all registered endpoints documented.")
        sys.exit(0)

if __name__ == '__main__':
    main()
