function evaluate(baseline, current, rule) {
 const result = (outcome, reason, extra = {}) => ({ outcome, reason, ...extra });
 if (!rule || !['maximum', 'minimum', 'reduction-percent'].includes(rule.type) || !Number.isFinite(rule.threshold) || (rule.type === 'reduction-percent' && (rule.threshold < 0 || rule.threshold > 100))) throw Object.assign(new Error('Supply explicit finite maximum/minimum/reduction-percent criterion'), { status: 400 });
 for (const field of ['provider', 'resourceId', 'metric', 'unit', 'aggregation']) if (!baseline[field] || baseline[field] !== current[field]) return result('inconclusive', `Incompatible ${field}`);
 const duration = w => Date.parse(w?.end) - Date.parse(w?.start);
 const durationMs = duration(baseline.window);
 if (!(durationMs > 0) || durationMs !== duration(current.window) || Date.parse(baseline.window.end) > Date.parse(current.window.start)) return result('inconclusive', 'Comparison requires equal-duration nonoverlapping ordered windows');
 if (baseline.status !== 'available' || current.status !== 'available' || baseline.missingData || current.missingData || baseline.truncated || current.truncated) return result('inconclusive', 'Telemetry unavailable, incomplete or truncated');
 // Fixed PT5M adapter grain: demand every expected bucket, including timestamps.
 const expected = Math.ceil(durationMs / 300000);
 const complete = data => data.observations?.length === expected && data.observations.every((v, i) => Number.isFinite(v.value) && Date.parse(v.timestamp) === Date.parse(data.window.start) + i * 300000);
 if (!complete(baseline) || !complete(current)) return result('inconclusive', 'Missing, duplicate or misaligned five-minute observations');
 const summarize = data => data.observations.reduce((sum, v) => sum + v.value, 0) / data.observations.length;
 // Total/Count require sum; Average is an explicitly unweighted mean of equal buckets.
 if (!['Average', 'Total', 'Count', 'Minimum', 'Maximum'].includes(current.aggregation)) return result('inconclusive', 'Unsupported aggregation');
 const value = data => ['Total', 'Count'].includes(data.aggregation) ? data.observations.reduce((s, v) => s + v.value, 0) : data.aggregation === 'Maximum' ? Math.max(...data.observations.map(v => v.value)) : data.aggregation === 'Minimum' ? Math.min(...data.observations.map(v => v.value)) : summarize(data);
 const before = value(baseline), after = value(current), difference = after - before;
 if (rule.type === 'reduction-percent' && before <= 0) return result('inconclusive', 'Positive baseline required for percentage reduction', { before, after, difference });
 const reductionPercent = before > 0 ? (before - after) / before * 100 : null;
 const passed = rule.type === 'maximum' ? after <= rule.threshold : rule.type === 'minimum' ? after >= rule.threshold : reductionPercent >= rule.threshold;
 return result(passed ? 'passed' : 'failed', `Evaluated ${current.aggregation} across ${expected} complete five-minute buckets against ${rule.type} ${rule.threshold}`, { before, after, difference, reductionPercent, threshold: rule.threshold, unit: current.unit });
}
module.exports = { evaluate };
