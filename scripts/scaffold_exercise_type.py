#!/usr/bin/env python3
"""
Scaffold a new exercise type skeleton (admin + player stubs).

Usage:
  python scripts/scaffold_exercise_type.py mytype "My Type Label"
"""
from __future__ import annotations
import os, sys, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

TEMPLATE_PLAYER = """/* static/js/ppx-{type}.js */
(function(){
  if (!window.PPX) { console.error('[PPX {TYPE}] PPX core not found'); return; }
  function plugin({ data, lang, api }){
    // TODO: implement using PPXPlayerUtils helpers
    api.setBody(document.createTextNode('Player for {TYPE} coming soon.'));
  }
  window.PPX.register && window.PPX.register('{type}', plugin);
})();
"""

def main():
  if len(sys.argv) < 3:
    print('Usage: scaffold_exercise_type.py <type> <Label>')
    sys.exit(1)
  etype = sys.argv[1].strip().lower()
  label = sys.argv[2].strip()
  if not etype:
    print('Type required')
    sys.exit(1)

  # JS player
  js_path = ROOT / 'static' / 'js' / f'ppx-{etype}.js'
  if js_path.exists():
    print(f'Exists: {js_path}')
  else:
    js_path.write_text(TEMPLATE_PLAYER.format(type=etype, TYPE=etype.upper()), encoding='utf-8')
    print(f'Created {js_path}')

  # Registry reminder
  print('\nNext steps:')
  print('- Add type to app/exercise_types.get_registry() with label and endpoints')
  print('- Create admin builder template + routes')
  print('- Add schema under data/schemas/exercises/')

if __name__ == '__main__':
  main()
"""
