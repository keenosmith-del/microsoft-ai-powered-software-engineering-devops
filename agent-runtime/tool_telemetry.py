"""Record bounded real invocations without retaining arguments, prompts or secrets."""
from contextvars import ContextVar
from datetime import datetime, timezone
from functools import wraps
import time

_active = ContextVar('tool_telemetry', default=None)

def begin():
    return _active.set([])

def finish(token):
    records = _active.get() or []
    _active.reset(token)
    return records

def record(name, at, duration, outcome, **metadata):
    records = _active.get()
    if records is not None and len(records) < 40:
        value = {'kind': 'tool', 'name': name, 'at': at, 'durationMs': max(0, round(duration * 1000)), 'outcome': outcome}
        value.update(metadata)
        records.append(value)

def observe(name):
    def decorator(fn):
        @wraps(fn)
        def invoke(*args, **kwargs):
            at = datetime.now(timezone.utc).isoformat()
            started = time.monotonic()
            try:
                value = fn(*args, **kwargs)
                record(name, at, time.monotonic() - started, 'available')
                return value
            except Exception:
                record(name, at, time.monotonic() - started, 'unavailable', error='Provider tool failed; details redacted')
                raise
        return invoke
    return decorator
