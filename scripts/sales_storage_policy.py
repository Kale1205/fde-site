"""Pure checks for the *pending* local-workspace contract; not runtime ACL enforcement.

No filesystem/network side effects. Actual paths, permissions and bootstrap are
verified later in the Administrator's local Codex task, not by these booleans.
"""
from __future__ import annotations

LOCAL_STORE = "Administrator-designated MacBook share-folder Sales Operations workspace"
LOCAL_ALLOWED_STORE = "Administrator-approved local Sales Operations data area outside Git tracking"
BOOTSTRAP_TEMPLATE = "docs/operations/templates/KALE_OUTREACH_WORKSPACE_AGENTS.md"
PENDING_FALSE_FIELDS = (
    "workspaceConfigured", "roleBootstrapInstalled", "governanceReadAccessVerified",
    "dataWritePermissionVerified", "runtimeIsolationVerified", "realDataGitTrackingAllowed",
    "realDataGitPushAllowed", "cloudMirrorEnabled", "googleDriveRequired",
)


def validate_local_workspace(config: object) -> list[str]:
    if not isinstance(config, dict):
        return ["localWorkspaceSetup must be an explicit pending-setup object"]
    errors: list[str] = []
    expected = {
        "state": "TARGET_PENDING_LOCAL_WORKSPACE_SETUP",
        "backend": "local_filesystem",
        "host": "Administrator MacBook",
        "parentFolderLabel": "share",
        "bootstrapTemplate": BOOTSTRAP_TEMPLATE,
    }
    for key, value in expected.items():
        if config.get(key) != value:
            errors.append(f"local workspace contract mismatch: {key}")
    for key in ("workspacePath", "dataPath"):
        if key not in config or config[key] is not None:
            errors.append(f"local path must remain unset until Administrator specifies it: {key}")
    for key in PENDING_FALSE_FIELDS:
        if config.get(key) is not False:
            errors.append(f"local workspace property must remain false in this foundation: {key}")
    expected_keys = set(expected) | {"workspacePath", "dataPath"} | set(PENDING_FALSE_FIELDS)
    if set(config) != expected_keys:
        errors.append("local workspace contract has missing or unsupported fields")
    return errors
