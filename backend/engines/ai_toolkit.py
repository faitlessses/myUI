from __future__ import annotations


def build_ai_toolkit_command(python_bin: str, config_path: str, override_command: str) -> str:
    if override_command.strip():
        return override_command.strip()
    return f"{python_bin} -m toolkit.train {config_path}"
