"""Import pure modules without executing the integration's HA setup imports."""

import sys
from importlib import import_module
from pathlib import Path
from types import ModuleType

_PACKAGE = "_ha_forensic_lab_core_tests"
_package = ModuleType(_PACKAGE)
_package.__path__ = [
    str(Path(__file__).parents[1] / "custom_components" / "ha_forensic_lab")
]
sys.modules[_PACKAGE] = _package


def load_module(name: str) -> ModuleType:
    """Keep relative imports and class identity consistent across pure tests."""
    return import_module(f"{_PACKAGE}.{name}")
