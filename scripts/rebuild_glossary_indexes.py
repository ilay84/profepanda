#!/usr/bin/env python3
from app.glossary_store import rebuild_indexes

if __name__ == '__main__':
    ok = rebuild_indexes()
    print('ok' if ok else 'failed')

