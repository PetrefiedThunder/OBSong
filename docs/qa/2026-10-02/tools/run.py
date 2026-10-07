#!/usr/bin/env python3
"""Run a local QA command with UTC logging and a credential-free environment."""
import datetime
import fcntl
import os
from pathlib import Path
import re
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parents[4]
QA = ROOT / 'docs/qa/2026-10-02'
group, label, command = sys.argv[1:4]
stamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
artifact = QA / 'artifacts' / f'{group}-{label}.txt'
env = {k: v for k, v in os.environ.items() if k in {
    'PATH', 'HOME', 'TMPDIR', 'LANG', 'TERM', 'PW_TEST_CONNECT_WS_ENDPOINT',
}}
env.update({
    'CI': '1', 'NEXT_TELEMETRY_DISABLED': '1',
    'COREPACK_HOME': '/private/tmp/obsong-qa-corepack',
    'XDG_CACHE_HOME': '/private/tmp/obsong-qa-cache',
    'npm_config_userconfig': '/dev/null',
})
def clean(text):
    text = re.sub(r'\x1b\[[0-9;]*m', '', text)
    text = re.sub(r'(?i)(Bearer\s+)[A-Za-z0-9._-]+', r'\1[REDACTED]', text)
    text = re.sub(r'\beyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\b', '[REDACTED]', text)
    return text

def log(message):
    for path in (QA / 'SESSION-LOG.md', QA / 'passes' / f'{group.upper()}-LOG.md'):
        with path.open('a') as stream:
            fcntl.flock(stream, fcntl.LOCK_EX)
            stream.write(message.replace('(artifacts/', '(../artifacts/') if path.parent.name == 'passes' else message)

log(f'\n- {stamp} **{group}/{label} started**: `{command.replace(chr(10), " ")}`\n')
started = time.monotonic()
process = subprocess.Popen(command, shell=True, executable='/bin/zsh', cwd=ROOT,
                           env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
try:
    with artifact.open('w') as stream:
        stream.write(f'UTC start: {stamp}\nCommand: {command}\n\n')
        for line in process.stdout:
            line = clean(line)
            stream.write(line)
            stream.flush()
            print(line, end='', flush=True)
    code = process.wait()
except KeyboardInterrupt:
    # Terminal interrupt also reaches the child process group.
    code = 130
end = datetime.datetime.now(datetime.timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')
log(f'- {end} **{group}/{label} ended**: exit {code}; {time.monotonic()-started:.1f}s. '
    f'[Output](artifacts/{artifact.name}).\n')
with artifact.open('a') as stream:
    stream.write(f'\nExit: {code}\n')
sys.exit(code)
