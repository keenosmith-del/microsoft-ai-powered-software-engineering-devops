import unittest
from tool_telemetry import begin, finish, observe

class ToolTelemetryTest(unittest.TestCase):
    def test_actual_success_failure_are_bounded_sanitized_and_isolated(self):
        @observe('fixture.read')
        def read(fail=False):
            if fail:
                raise RuntimeError('Secret fixture provider detail')
            return 'fixture evidence'
        token = begin()
        self.assertEqual(read(), 'fixture evidence')
        with self.assertRaises(RuntimeError):
            read(True)
        records = finish(token)
        self.assertEqual([r['outcome'] for r in records], ['available', 'unavailable'])
        self.assertNotIn('Secret', str(records))
        self.assertTrue(all(r['durationMs'] >= 0 for r in records))
        token = begin()
        for _ in range(60):
            read()
        self.assertEqual(len(finish(token)), 40)
        token = begin()
        self.assertEqual(finish(token), [])

    def test_provider_usage_is_recorded_only_when_returned(self):
        from types import SimpleNamespace
        from unittest.mock import MagicMock
        from agents.foundry_client import FoundryClient
        client = object.__new__(FoundryClient)
        client.deployment = 'fixture-deployment'
        client.client = MagicMock()
        client.client.chat.completions.create.return_value = SimpleNamespace(choices=[SimpleNamespace(message=SimpleNamespace(content='Fixture response'))], usage=SimpleNamespace(prompt_tokens=2, completion_tokens=3, total_tokens=5))
        token = begin()
        client.chat('Fixture prompt')
        records = finish(token)
        response = next(r for r in records if r['name'] == 'foundry.model-response')
        self.assertEqual(response['totalTokens'], 5)
        self.assertEqual(response['deployment'], 'fixture-deployment')
        self.assertNotIn('Fixture prompt', str(records))
