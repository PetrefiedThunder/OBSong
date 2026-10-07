#!/usr/bin/env python3
"""Reveal known-bug assertions, then restore the expected-failure test files."""
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[4]
paths = [
    root / 'apps/web/src/lib/__tests__/imageProcessing.qa.test.ts',
    root / 'apps/mobile/src/state/__tests__/CompositionsProvider.qa.test.ts',
    root / 'apps/mobile/src/auth/__tests__/secureStorage.qa.test.ts',
]
originals = {path: path.read_bytes() for path in paths}
statuses = []
try:
    for path, original in originals.items():
        path.write_bytes(original.replace(b'it.fails(', b'it('))
    for workspace, tests in [
        ('@toposonics/web', ['src/lib/__tests__/imageProcessing.qa.test.ts']),
        ('@toposonics/mobile', [
            'src/state/__tests__/CompositionsProvider.qa.test.ts',
            'src/auth/__tests__/secureStorage.qa.test.ts',
        ]),
    ]:
        command = ['corepack', 'pnpm', '--filter', workspace, 'exec', 'vitest', 'run', *tests]
        print('Negative control command:', ' '.join(command), flush=True)
        result = subprocess.run(command, cwd=root, check=False)
        statuses.append(result.returncode)
        print('Negative control exit:', result.returncode, flush=True)
finally:
    for path, original in originals.items():
        path.write_bytes(original)
    print('Restored original test bytes (it.fails markers retained).', flush=True)
sys.exit(0 if statuses == [1, 1] else 1)
