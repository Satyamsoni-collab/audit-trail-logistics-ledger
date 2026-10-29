import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend } from 'k6/metrics';

// Custom Prometheus-compatible performance metrics
export const errorRate = new Rate('errors');
export const cacheHitRate = new Rate('cache_hits');
export const cachedQueryDuration = new Trend('cached_query_duration_ms');

// Production-grade load test stages simulating realistic burst traffic
export const options = {
  stages: [
    { duration: '30s', target: 20 },  // Warm-up to 20 virtual users
    { duration: '1m',  target: 50 },  // Normal production load (50 VUs)
    { duration: '30s', target: 100 }, // Peak spike load (100 VUs)
    { duration: '30s', target: 0 },   // Graceful ramp-down to 0
  ],
  thresholds: {
    // 95% of Redis-cached query responses must return in under 50ms
    'http_req_duration': ['p(95)<50', 'p(99)<100'],
    // Error rate must remain strictly below 1% under peak concurrency
    'errors': ['rate<0.01'],
    // Over 90% of requests should be served from Redis cache after warm-up
    'cache_hits': ['rate>0.90']
  }
};

const BASE_URL = __ENV.API_HOST || 'http://localhost:3000';

export default function () {
  const headers = {
    'Accept': 'application/json',
    'User-Agent': 'k6-load-testing-suite/v1.0'
  };

  // 1. Stress Test: Redis-Cached Real-Time Analytics View
  const realtimeRes = http.get(`${BASE_URL}/api/queries/analytics/realtime`, { headers });
  
  const isOk = check(realtimeRes, {
    'status is 200': (r) => r.status === 200,
    'has valid payload': (r) => {
      try {
        const body = JSON.parse(r.body);
        return body && body.status === 'success';
      } catch (e) {
        return false;
      }
    }
  });

  errorRate.add(!isOk);
  cachedQueryDuration.add(realtimeRes.timings.duration);

  // Track cache hit efficiency from backend response source
  try {
    const json = JSON.parse(realtimeRes.body);
    cacheHitRate.add(json.source === 'redis_cache' || json.source === 'cache');
  } catch (e) {
    cacheHitRate.add(false);
  }

  // 2. High-Frequency Read Query: Inventory Catalog Query
  const catalogRes = http.get(`${BASE_URL}/api/queries/inventory?limit=10&page=1`, { headers });
  check(catalogRes, {
    'catalog status is 200 or 304': (r) => r.status === 200 || r.status === 304
  });

  // Brief think-time between user actions
  sleep(0.1);
}
