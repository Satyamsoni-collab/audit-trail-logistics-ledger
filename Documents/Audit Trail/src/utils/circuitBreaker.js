import logger from './logger.js';
import telemetryService from './telemetry.js';

/**
 * Enterprise Circuit Breaker Wrapper (Opossum Compatible)
 * 
 * Protects event-sourcing pipelines, message broker operations, and database
 * calls from cascading failures under heavy load or downstream outages.
 */
class ResilientCircuitBreaker {
  constructor(actionFn, options = {}) {
    this.actionFn = actionFn;
    this.name = options.name || 'default-breaker';
    this.timeout = options.timeout || 3000;
    this.errorThresholdPercentage = options.errorThresholdPercentage || 50;
    this.resetTimeout = options.resetTimeout || 30000;
    this.fallbackFn = options.fallback || null;

    this.state = 'CLOSED'; // 'CLOSED', 'OPEN', 'HALF_OPEN'
    this.failures = 0;
    this.successes = 0;
    this.totalCalls = 0;
    this.openedAt = null;

    this.opossumInstance = null;
    this.initOpossum(options);
  }

  async initOpossum(options) {
    try {
      const OpossumModule = await import('opossum');
      const CircuitBreaker = OpossumModule.default || OpossumModule;

      this.opossumInstance = new CircuitBreaker(this.actionFn, {
        timeout: this.timeout,
        errorThresholdPercentage: this.errorThresholdPercentage,
        resetTimeout: this.resetTimeout,
        name: this.name,
        ...options
      });

      if (this.fallbackFn) {
        this.opossumInstance.fallback(this.fallbackFn);
      }

      this.opossumInstance.on('open', () => {
        this.state = 'OPEN';
        logger.error(`🚨 [CircuitBreaker:${this.name}] State transitioned to OPEN. Fast-failing calls.`);
      });

      this.opossumInstance.on('close', () => {
        this.state = 'CLOSED';
        logger.info(`🟢 [CircuitBreaker:${this.name}] State transitioned to CLOSED. Healthy.`);
      });

      this.opossumInstance.on('halfOpen', () => {
        this.state = 'HALF_OPEN';
        logger.info(`🟡 [CircuitBreaker:${this.name}] State transitioned to HALF_OPEN. Testing recovery.`);
      });
    } catch (_) {
      // Opossum package optional / fallback mode
    }
  }

  async fire(...args) {
    if (this.opossumInstance) {
      return this.opossumInstance.fire(...args);
    }

    // Native Resilient Circuit Breaker Implementation (Fallback)
    if (this.state === 'OPEN') {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed > this.resetTimeout) {
        this.state = 'HALF_OPEN';
        logger.info(`🟡 [CircuitBreaker:${this.name}] Probing recovery (HALF_OPEN).`);
      } else {
        const error = new Error(`CircuitBreaker[${this.name}] is OPEN. Fast-failing request.`);
        error.code = 'E_CIRCUIT_OPEN';
        if (this.fallbackFn) return this.fallbackFn(...args);
        throw error;
      }
    }

    try {
      const promise = this.actionFn(...args);
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Operation timed out after ${this.timeout}ms`)), this.timeout)
      );

      const result = await Promise.race([promise, timeoutPromise]);
      this.recordSuccess();
      return result;
    } catch (err) {
      this.recordFailure();
      if (this.fallbackFn) return this.fallbackFn(...args);
      throw err;
    }
  }

  recordSuccess() {
    this.successes++;
    this.totalCalls++;
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      this.failures = 0;
      logger.info(`🟢 [CircuitBreaker:${this.name}] System recovered. Closed.`);
    }
  }

  recordFailure() {
    this.failures++;
    this.totalCalls++;

    const failureRate = (this.failures / this.totalCalls) * 100;
    if (this.state === 'HALF_OPEN' || (this.totalCalls >= 5 && failureRate >= this.errorThresholdPercentage)) {
      this.state = 'OPEN';
      this.openedAt = Date.now();
      logger.error(`🚨 [CircuitBreaker:${this.name}] Error rate at ${failureRate.toFixed(1)}%. Tripped to OPEN.`);
    }
  }

  fallback(fn) {
    this.fallbackFn = fn;
    if (this.opossumInstance) {
      this.opossumInstance.fallback(fn);
    }
  }
}

/**
 * Factory to create circuit-breaker protected functions.
 */
export const createCircuitBreaker = (actionFn, options) => {
  return new ResilientCircuitBreaker(actionFn, options);
};

export default ResilientCircuitBreaker;
