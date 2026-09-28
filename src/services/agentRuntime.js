const AGENT_RUNTIME_URL =
    process.env.AGENT_RUNTIME_URL || 'http://127.0.0.1:8000';

async function runInvestigation(problem) {
    const response = await fetch(`${AGENT_RUNTIME_URL}/analyse`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ problem }),
    });
    const data = await response.json();

    if (!response.ok) {
        throw new Error(
            data.detail || data.error || 'Agent runtime request failed',
        );
    }

    return data;
}

module.exports = { runInvestigation };
