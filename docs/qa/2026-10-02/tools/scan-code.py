#!/usr/bin/env python3
"""Offline, redacted scan of source/docs only. Never opens env/credential files."""
import json
from pathlib import Path
import subprocess
import sys

root = Path(__file__).resolve().parents[4]
include_qa = '--include-qa' in sys.argv
args = ['git', 'ls-files', '-z']
if include_qa:
    args += ['--cached', '--others', '--exclude-standard']
tracked = subprocess.check_output(args, cwd=root).decode().split('\0')
suffixes = {'.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.py', '.md', '.json', '.yaml', '.yml', '.kt', '.swift', '.txt'}
findings = []
scanned = 0
for name in tracked:
    path = Path(name)
    if not name or path.suffix not in suffixes:
        continue
    if any(word in name.lower() for word in ('.env', 'credential', 'keystore', 'secret', 'lock.yaml', '.pnpm-store')):
        continue
    data = (root / path).read_bytes()
    result = subprocess.run(['gitleaks', 'stdin', '--redact=100', '--no-banner', '--no-color',
                             '--log-level', 'error', '--report-format', 'json', '--report-path', '-'],
                            input=data, capture_output=True, cwd=root)
    if result.returncode not in (0, 1):
        raise RuntimeError(f'gitleaks failed for {name}: exit {result.returncode}')
    scanned += 1
    for hit in json.loads(result.stdout or b'[]'):
        findings.append({'file': name, 'line': hit['StartLine'], 'rule': hit['RuleID'], 'value': '[REDACTED]'})
report = {'scope': ('tracked and added source/docs/evidence' if include_qa else 'tracked source/docs') + '; env and credential paths excluded; no git history',
          'files_scanned': scanned, 'findings': findings}
output = root / 'docs/qa/2026-10-02/artifacts' / ('code-secret-scan-final.json' if include_qa else 'code-secret-scan.json')
output.write_text(json.dumps(report, indent=2) + '\n')
print(json.dumps(report, indent=2))
