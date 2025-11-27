# common/taxonomy.py
from __future__ import annotations

import json
from functools import lru_cache
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple

# Base directory for taxonomy JSON files
_TAXONOMY_DIR = Path("data/ui/taxonomy")

# Public API (documented in the plan):
# - load_taxonomy(name) -> dict
# - title_for(path, lang)
# - children_of(path)
# - ancestors(path)
# - is_ancestor(ancestor, path)


def _read_json(path: Path) -> Dict[str, Any]:
    if not path.exists():
        raise FileNotFoundError(f"Taxonomy file not found: {path}")
    try:
        with path.open("r", encoding="utf-8") as f:
            return json.load(f)
    except json.JSONDecodeError as e:
        raise ValueError(f"Invalid JSON in {path}: {e}") from e


def _iter_nodes(nodes: List[Dict[str, Any]]) -> Tuple[Dict[str, Any], ...]:
    """Depth-first iteration over nodes with children."""
    stack = list(reversed(nodes or []))
    out: List[Dict[str, Any]] = []
    while stack:
        n = stack.pop()
        out.append(n)
        for c in reversed(n.get("children", []) or []):
            stack.append(c)
    return tuple(out)


def _index_nodes(nodes: List[Dict[str, Any]]) -> Tuple[Dict[str, Dict[str, Any]], Dict[str, List[Dict[str, Any]]]]:
    """
    Build:
      - by_path: { "verbs/subjunctive": node }
      - children: { "verbs": [child1, child2, ...] }
    """
    by_path: Dict[str, Dict[str, Any]] = {}
    children: Dict[str, List[Dict[str, Any]]] = {}

    for node in _iter_nodes(nodes):
        path = node.get("path", "").strip().strip("/")
        if not path:
            # Allow root-like buckets if ever used, but skip indexing blank paths
            continue
        by_path[path] = node

    # Populate children map
    for node in by_path.values():
        parent = "/".join(node["path"].split("/")[:-1])
        children.setdefault(parent, []).append(node)

    # Ensure stable ordering by ES title then EN title, then path
    def sort_key(n: Dict[str, Any]) -> Tuple[str, str, str]:
        t = n.get("title", {})
        return (str(t.get("es", "")).lower(), str(t.get("en", "")).lower(), n.get("path", ""))

    for p in list(children.keys()):
        children[p].sort(key=sort_key)

    return by_path, children


@lru_cache(maxsize=8)
def load_taxonomy(name: str) -> Dict[str, Any]:
    """
    Load a taxonomy JSON file by name (e.g., 'grammar') and build indices.

    Returns a dict:
      {
        "raw": <original_json>,
        "by_path": { path: node, ... },
        "children": { parent_path: [child_nodes], ... }
      }
    """
    file_path = (_TAXONOMY_DIR / f"{name}.json").resolve()
    raw = _read_json(file_path)

    nodes = raw.get("nodes", []) or []
    by_path, children = _index_nodes(nodes)

    return {
        "raw": raw,
        "by_path": by_path,
        "children": children,
    }


def title_for(path: str, lang: str = "es", fallback: str = "en") -> Optional[str]:
    """
    Get localized title for a topic path, with graceful fallback.
    Returns None if the path is unknown.
    """
    path = (path or "").strip().strip("/")
    if not path:
        return None
    tx = load_taxonomy("grammar")
    node = tx["by_path"].get(path)
    if not node:
        return None
    t = node.get("title", {}) or {}
    if lang in t and t[lang]:
        return t[lang]
    if fallback in t and t[fallback]:
        return t[fallback]
    # last resort: derive from path segment
    return path.rsplit("/", 1)[-1].replace("-", " ").title()


def children_of(path: Optional[str]) -> List[Dict[str, Any]]:
    """
    Return immediate child nodes for a given path.
    Root-children: use path=None or ''.
    """
    key = "" if not path else str(path).strip().strip("/")
    tx = load_taxonomy("grammar")
    return list(tx["children"].get(key, []))


def ancestors(path: str) -> List[str]:
    """
    Return ancestor paths from root to parent of `path`.
    Example: 'verbs/subjunctive/present' -> ['verbs', 'verbs/subjunctive']
    """
    path = (path or "").strip().strip("/")
    if not path:
        return []
    parts = path.split("/")
    return ["/".join(parts[:i]) for i in range(1, len(parts))]


def is_ancestor(ancestor: str, path: str) -> bool:
    """
    True if `ancestor` is an ancestor of `path` (strict), supporting arbitrary depth.
    """
    ancestor = (ancestor or "").strip().strip("/")
    path = (path or "").strip().strip("/")
    if not ancestor or not path or ancestor == path:
        return False
    return path.startswith(ancestor + "/")


# Convenience: safe lookup returning a node dict or None
def node_for(path: str) -> Optional[Dict[str, Any]]:
    tx = load_taxonomy("grammar")
    return tx["by_path"].get((path or "").strip().strip("/"))


# Convenience: breadcrumb tuples (path, title)
def breadcrumb(path: str, lang: str = "es") -> List[Tuple[str, str]]:
    """
    Build breadcrumb from root to `path`.
    """
    path = (path or "").strip().strip("/")
    if not path:
        return []
    crumbs = []
    for p in ancestors(path) + [path]:
        crumbs.append((p, title_for(p, lang=lang)))
    return crumbs
