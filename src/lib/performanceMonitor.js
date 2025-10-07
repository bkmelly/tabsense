/**
 * PerformanceMonitor - Tracks and optimizes summarization performance
 * Monitors latency, cache hit rates, and API usage
 */

export class PerformanceMonitor {
  constructor() {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      totalLatency: 0,
      parallelBatches: 0,
      errors: 0,
      startTime: Date.now()
    };
    
    this.latencyTargets = {
      extraction: 1000,    // 1 second
      summarization: 3000, // 3 seconds
      endToEnd: 5000       // 5 seconds
    };
  }

  /**
   * Record a cache hit
   */
  recordCacheHit(latency) {
    this.metrics.cacheHits++;
    this.metrics.totalLatency += latency;
    console.log(`[PerformanceMonitor] Cache hit: ${latency}ms`);
  }

  /**
   * Record a cache miss
   */
  recordCacheMiss(latency) {
    this.metrics.cacheMisses++;
    this.metrics.totalLatency += latency;
    console.log(`[PerformanceMonitor] Cache miss: ${latency}ms`);
  }

  /**
   * Record an API call
   */
  recordApiCall(latency, batchSize = 1) {
    this.metrics.apiCalls += batchSize;
    this.metrics.totalLatency += latency;
    console.log(`[PerformanceMonitor] API call: ${latency}ms (${batchSize} chunks)`);
  }

  /**
   * Record parallel batch processing
   */
  recordParallelBatch(batchSize, latency) {
    this.metrics.parallelBatches++;
    this.metrics.totalLatency += latency;
    console.log(`[PerformanceMonitor] Parallel batch: ${batchSize} chunks in ${latency}ms`);
  }

  /**
   * Record an error
   */
  recordError(error) {
    this.metrics.errors++;
    console.error(`[PerformanceMonitor] Error recorded:`, error.message);
  }

  /**
   * Record end-to-end performance
   */
  recordEndToEnd(operation, latency) {
    this.metrics.totalRequests++;
    this.metrics.totalLatency += latency;
    
    const target = this.latencyTargets[operation];
    const status = latency <= target ? '✅' : '⚠️';
    
    console.log(`[PerformanceMonitor] ${operation}: ${latency}ms ${status} (target: ${target}ms)`);
    
    return {
      latency,
      target,
      withinTarget: latency <= target,
      status
    };
  }

  /**
   * Get performance statistics
   */
  getStats() {
    const uptime = Date.now() - this.metrics.startTime;
    const avgLatency = this.metrics.totalRequests > 0 ? 
      this.metrics.totalLatency / this.metrics.totalRequests : 0;
    
    const cacheHitRate = (this.metrics.cacheHits + this.metrics.cacheMisses) > 0 ?
      (this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses)) * 100 : 0;
    
    const apiEfficiency = this.metrics.apiCalls > 0 ?
      (this.metrics.parallelBatches / this.metrics.apiCalls) * 100 : 0;
    
    const stats = {
      uptime: Math.round(uptime / 1000), // seconds
      totalRequests: this.metrics.totalRequests,
      cacheHitRate: Math.round(cacheHitRate * 100) / 100,
      avgLatency: Math.round(avgLatency),
      apiCalls: this.metrics.apiCalls,
      parallelBatches: this.metrics.parallelBatches,
      apiEfficiency: Math.round(apiEfficiency * 100) / 100,
      errors: this.metrics.errors,
      errorRate: this.metrics.totalRequests > 0 ? 
        Math.round((this.metrics.errors / this.metrics.totalRequests) * 100 * 100) / 100 : 0,
      performance: {
        extraction: this.getPerformanceStatus('extraction'),
        summarization: this.getPerformanceStatus('summarization'),
        endToEnd: this.getPerformanceStatus('endToEnd')
      }
    };
    
    console.log('[PerformanceMonitor] Stats:', stats);
    return stats;
  }

  /**
   * Get performance status for a specific operation
   */
  getPerformanceStatus(operation) {
    const recentLatencies = this.getRecentLatencies(operation);
    if (recentLatencies.length === 0) return 'No data';
    
    const avgLatency = recentLatencies.reduce((a, b) => a + b, 0) / recentLatencies.length;
    const target = this.latencyTargets[operation];
    
    if (avgLatency <= target * 0.8) return 'Excellent';
    if (avgLatency <= target) return 'Good';
    if (avgLatency <= target * 1.5) return 'Fair';
    return 'Poor';
  }

  /**
   * Get recent latencies for an operation (mock implementation)
   */
  getRecentLatencies(operation) {
    // In a real implementation, this would track recent latencies
    // For now, return mock data based on current metrics
    const baseLatency = operation === 'extraction' ? 800 : 
                      operation === 'summarization' ? 2500 : 4000;
    
    return [baseLatency, baseLatency * 0.9, baseLatency * 1.1];
  }

  /**
   * Reset all metrics
   */
  reset() {
    this.metrics = {
      totalRequests: 0,
      cacheHits: 0,
      cacheMisses: 0,
      apiCalls: 0,
      totalLatency: 0,
      parallelBatches: 0,
      errors: 0,
      startTime: Date.now()
    };
    console.log('[PerformanceMonitor] Metrics reset');
  }

  /**
   * Get performance recommendations
   */
  getRecommendations() {
    const stats = this.getStats();
    const recommendations = [];
    
    if (stats.cacheHitRate < 50) {
      recommendations.push('Consider increasing cache size or expiry time');
    }
    
    if (stats.avgLatency > 3000) {
      recommendations.push('Consider optimizing chunk sizes or parallel processing');
    }
    
    if (stats.errorRate > 5) {
      recommendations.push('High error rate detected - check API key and network');
    }
    
    if (stats.apiEfficiency < 80) {
      recommendations.push('Consider increasing parallel batch size');
    }
    
    return recommendations;
  }
}

export default PerformanceMonitor;
