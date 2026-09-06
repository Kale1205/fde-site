#!/usr/bin/env python3
"""Synthetic config-mutation tests, not tests of the Administrator's MacBook."""
from __future__ import annotations

import json
from copy import deepcopy
from pathlib import Path

from sales_storage_policy import PENDING_FALSE_FIELDS, validate_local_workspace
from validate_agent_runtime import validate_model as validate_runtime
from validate_sales_operations import validate_model as validate_sales

ROOT = Path(__file__).resolve().parents[1]


def main() -> int:
    runtime = json.loads((ROOT / "docs/operations/agent-runtime-governance.json").read_text(encoding="utf-8"))
    sales = json.loads((ROOT / "docs/operations/sales-operations-governance.json").read_text(encoding="utf-8"))
    assert runtime["localWorkspaceSetup"] == sales["localWorkspaceSetup"]
    count = 0
    for original, validator in ((runtime, validate_runtime), (sales, validate_sales)):
        assert not validator(original), validator(original)
        for key in PENDING_FALSE_FIELDS:
            for value in (True, "false", None):
                candidate = deepcopy(original)
                candidate["localWorkspaceSetup"][key] = value
                errors = validator(candidate)
                assert any(key in error for error in errors), (key, value, errors)
                count += 1
        for key in ("workspacePath", "dataPath"):
            candidate = deepcopy(original)
            candidate["localWorkspaceSetup"][key] = "/synthetic-not-an-approved-path"
            assert any(key in error for error in validator(candidate))
            count += 1
        for key, value in (("backend", "google_drive"), ("state", "IMPLEMENTED"), ("bootstrapTemplate", "AGENTS.md")):
            candidate = deepcopy(original)
            candidate["localWorkspaceSetup"][key] = value
            assert any(key in error for error in validator(candidate))
            count += 1
        candidate = deepcopy(original)
        candidate.pop("localWorkspaceSetup")
        assert validator(candidate)
        count += 1
    candidate = deepcopy(runtime)
    candidate["outreachSales"]["targetDataLayer"] = "Google Drive / Google Sheets"
    assert validate_runtime(candidate)
    candidate = deepcopy(sales)
    candidate["persistentDataLayer"]["target"] = "Google Drive / Google Sheets"
    assert validate_sales(candidate)
    candidate = deepcopy(sales)
    candidate["storageBoundary"]["realSalesDataAllowedStores"].append("private GitHub repository")
    assert validate_sales(candidate)
    candidate = deepcopy(sales)
    candidate["persistentDataLayer"]["connectionImplemented"] = True
    assert validate_sales(candidate)
    for value in (None, [], "installed", True):
        assert validate_local_workspace(value)
    print(f"Local Sales Workspace negative tests passed ({count + 8} cases).")
    print("No local MacBook access, real-data write, remote push, sender or schedule exercised.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
