/*
  Local load test for public form submissions.

  Example:
    tsx scripts/load-test-form-submit.ts --slug=my-form-slug --total=10000 --concurrency=200 --baseUrl=http://localhost:3000
*/

type Config = {
  baseUrl: string;
  slug: string;
  total: number;
  concurrency: number;
  timeoutMs: number;
};

function getArg(name: string, fallback?: string): string | undefined {
  const prefix = `--${name}=`;
  const direct = process.argv.find((a) => a.startsWith(prefix));
  if (direct) return direct.slice(prefix.length);

  const index = process.argv.findIndex((a) => a === `--${name}`);
  if (index >= 0 && process.argv[index + 1]) return process.argv[index + 1];

  return fallback;
}

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

function buildConfig(): Config {
  const helpRequested = process.argv.includes('--help') || process.argv.includes('-h');
  if (helpRequested) {
    console.log('Usage: npm run test:load:forms -- --slug=<form-slug> [--total=1000] [--concurrency=100] [--baseUrl=http://localhost:3000] [--timeoutMs=15000]');
    process.exit(0);
  }

  const baseUrl = (getArg('baseUrl', 'http://localhost:3000') || 'http://localhost:3000').replace(/\/$/, '');
  const slug = getArg('slug');
  const total = toInt(getArg('total', '1000'), 1000);
  const concurrency = toInt(getArg('concurrency', '100'), 100);
  const timeoutMs = toInt(getArg('timeoutMs', '15000'), 15000);

  if (!slug) {
    throw new Error('Missing required argument --slug=<form-slug>');
  }

  return { baseUrl, slug, total, concurrency, timeoutMs };
}

async function main() {
  const cfg = buildConfig();
  const submitUrl = `${cfg.baseUrl}/api/v1/forms/${cfg.slug}/submit`;

  console.log('--- Form Load Test ---');
  console.log(`Target URL      : ${submitUrl}`);
  console.log(`Total requests  : ${cfg.total}`);
  console.log(`Concurrency     : ${cfg.concurrency}`);
  console.log(`Timeout/request : ${cfg.timeoutMs} ms`);

  const warmup = await fetch(`${cfg.baseUrl}/api/v1/forms/${cfg.slug}`);
  if (!warmup.ok) {
    throw new Error(`Warmup failed. GET /api/v1/forms/${cfg.slug} returned ${warmup.status}. Is the form published?`);
  }

  let nextIndex = 0;
  let completed = 0;
  let success = 0;
  let failed = 0;

  const statusCounts = new Map<number, number>();
  const latencies: number[] = [];

  const startedAt = Date.now();

  async function worker(workerId: number) {
    while (true) {
      const index = nextIndex++;
      if (index >= cfg.total) return;

      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), cfg.timeoutMs);
      const reqStart = Date.now();

      try {
        const payload = {
          submissionKey: `load-${workerId}-${index}-${Date.now()}`,
          responder: {
            studentId: `S-${index + 1}`,
            name: `Student ${index + 1}`,
          },
          answers: {
            moduleRating: ((index % 5) + 1).toString(),
            wouldRecommend: index % 2 === 0 ? 'yes' : 'no',
            feedback: `Load test feedback ${index + 1}`,
          },
          startedAt: new Date(reqStart - (index % 180000)).toISOString(),
          durationMs: (index % 120000) + 500,
        };

        const res = await fetch(submitUrl, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          signal: ctrl.signal,
        });

        const ms = Date.now() - reqStart;
        latencies.push(ms);

        statusCounts.set(res.status, (statusCounts.get(res.status) || 0) + 1);
        if (res.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        const ms = Date.now() - reqStart;
        latencies.push(ms);
        failed++;
      } finally {
        clearTimeout(timer);
        completed++;

        if (completed % Math.max(100, Math.floor(cfg.total / 20)) === 0) {
          const elapsed = (Date.now() - startedAt) / 1000;
          const rps = elapsed > 0 ? (completed / elapsed).toFixed(2) : '0.00';
          console.log(`Progress: ${completed}/${cfg.total} | ok=${success} fail=${failed} | avg RPS=${rps}`);
        }
      }
    }
  }

  await Promise.all(
    Array.from({ length: cfg.concurrency }, (_, i) => worker(i + 1))
  );

  const totalMs = Date.now() - startedAt;
  const totalSec = totalMs / 1000;
  const avgLatency = latencies.length
    ? latencies.reduce((sum, x) => sum + x, 0) / latencies.length
    : 0;

  const p50 = percentile(latencies, 50);
  const p95 = percentile(latencies, 95);
  const p99 = percentile(latencies, 99);

  console.log('\n--- Result ---');
  console.log(`Duration        : ${totalSec.toFixed(2)} s`);
  console.log(`Completed       : ${completed}`);
  console.log(`Success         : ${success}`);
  console.log(`Failed          : ${failed}`);
  console.log(`Success rate    : ${completed ? ((success / completed) * 100).toFixed(2) : '0.00'}%`);
  console.log(`Throughput      : ${totalSec > 0 ? (completed / totalSec).toFixed(2) : '0.00'} req/s`);
  console.log(`Latency avg/p50 : ${avgLatency.toFixed(2)} / ${p50.toFixed(0)} ms`);
  console.log(`Latency p95/p99 : ${p95.toFixed(0)} / ${p99.toFixed(0)} ms`);

  const sortedStatus = [...statusCounts.entries()].sort((a, b) => a[0] - b[0]);
  for (const [status, count] of sortedStatus) {
    console.log(`HTTP ${status}: ${count}`);
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error('Load test failed:', err instanceof Error ? err.message : err);
  process.exit(1);
});
