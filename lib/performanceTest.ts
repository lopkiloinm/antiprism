/**
 * Performance test suite for the ultra-fast Yjs-RxDB connector
 * Tests stress scenarios and benchmarks performance
 */

"use client";

import { FileDocumentManager } from "./fastFileDocumentManager";
import { WebrtcProvider } from "y-webrtc";
import { yjsLogger } from "./logger";

interface TestMetrics {
  documentLoadTime: number;
  operationProcessingTime: number;
  memoryUsage: number;
  cacheHitRate: number;
  throughput: number;
}

interface StressTestConfig {
  concurrentDocuments: number;
  operationsPerSecond: number;
  documentSize: number;
  testDuration: number;
}

/**
 * Performance testing suite
 */
export class PerformanceTest {
  private manager: FileDocumentManager;
  private metrics: TestMetrics[] = [];
  private globalWebrtcProvider: WebrtcProvider;

  constructor() {
    this.globalWebrtcProvider = new WebrtcProvider('test-webrtc', new (require('yjs').Doc)());
    this.manager = new FileDocumentManager('test-project', this.globalWebrtcProvider);
  }

  async initialize(): Promise<void> {
    await this.manager.initialize();
    yjsLogger.info("Performance test initialized");
  }

  /**
   * Test document loading performance
   */
  async testDocumentLoadPerformance(): Promise<TestMetrics> {
    const startTime = performance.now();
    const startMemory = this.getMemoryUsage();
    
    // Load 100 documents
    const documents = [];
    for (let i = 0; i < 100; i++) {
      const doc = this.manager.getDocument(`/test_${i}.tex`);
      documents.push(doc);
      await doc.whenLoaded;
    }
    
    const endTime = performance.now();
    const endMemory = this.getMemoryUsage();
    
    const metrics: TestMetrics = {
      documentLoadTime: endTime - startTime,
      operationProcessingTime: 0,
      memoryUsage: endMemory - startMemory,
      cacheHitRate: 0,
      throughput: 100 / ((endTime - startTime) / 1000) // docs per second
    };
    
    this.metrics.push(metrics);
    
    yjsLogger.info("Document load performance test completed", metrics);
    
    // Cleanup
    documents.forEach(doc => this.manager.removeDocument(doc.doc.getText('content').toString()));
    
    return metrics;
  }

  /**
   * Test high-frequency operations
   */
  async testHighFrequencyOperations(): Promise<TestMetrics> {
    const doc = this.manager.getDocument('/stress_test.tex');
    await doc.whenLoaded;
    
    const startTime = performance.now();
    const operations = 1000;
    
    // Simulate rapid typing
    for (let i = 0; i < operations; i++) {
      doc.text.insert(i, 'x');
      
      // Small delay to simulate realistic typing
      if (i % 100 === 0) {
        await new Promise(resolve => setTimeout(resolve, 1));
      }
    }
    
    const endTime = performance.now();
    
    const metrics: TestMetrics = {
      documentLoadTime: 0,
      operationProcessingTime: (endTime - startTime) / operations,
      memoryUsage: this.getMemoryUsage(),
      cacheHitRate: 0,
      throughput: operations / ((endTime - startTime) / 1000) // ops per second
    };
    
    this.metrics.push(metrics);
    
    yjsLogger.info("High frequency operations test completed", metrics);
    
    this.manager.removeDocument('/stress_test.tex');
    
    return metrics;
  }

  /**
   * Test memory management under stress
   */
  async testMemoryStress(): Promise<TestMetrics> {
    const startMemory = this.getMemoryUsage();
    const documents = [];
    
    // Create many large documents
    for (let i = 0; i < 50; i++) {
      const doc = this.manager.getDocument(`/memory_test_${i}.tex`);
      await doc.whenLoaded;
      
      // Add large content (simulate 1MB document)
      const largeContent = 'x'.repeat(1000000);
      doc.text.insert(0, largeContent);
      
      documents.push(doc);
    }
    
    const peakMemory = this.getMemoryUsage();
    
    // Test cache cleanup
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    // Remove half the documents
    for (let i = 0; i < 25; i++) {
      this.manager.removeDocument(`/memory_test_${i}.tex`);
    }
    
    // Force garbage collection again
    if (global.gc) {
      global.gc();
    }
    
    const finalMemory = this.getMemoryUsage();
    
    const metrics: TestMetrics = {
      documentLoadTime: 0,
      operationProcessingTime: 0,
      memoryUsage: peakMemory - startMemory,
      cacheHitRate: 0,
      throughput: 0
    };
    
    this.metrics.push(metrics);
    
    yjsLogger.info("Memory stress test completed", {
      peakMemoryUsage: peakMemory - startMemory,
      finalMemoryUsage: finalMemory - startMemory,
      memoryReclaimed: peakMemory - finalMemory
    });
    
    // Cleanup remaining documents
    for (let i = 25; i < 50; i++) {
      this.manager.removeDocument(`/memory_test_${i}.tex`);
    }
    
    return metrics;
  }

  /**
   * Comprehensive stress test
   */
  async runStressTest(config: StressTestConfig): Promise<void> {
    yjsLogger.info("Starting comprehensive stress test", config);
    
    const startTime = performance.now();
    const documents = [];
    
    // Create documents
    for (let i = 0; i < config.concurrentDocuments; i++) {
      const doc = this.manager.getDocument(`/stress_${i}.tex`);
      await doc.whenLoaded;
      
      // Add initial content
      const content = 'x'.repeat(config.documentSize);
      doc.text.insert(0, content);
      
      documents.push(doc);
    }
    
    // Simulate concurrent operations
    const operationsPerDocument = Math.floor(
      (config.operationsPerSecond * config.testDuration) / config.concurrentDocuments
    );
    
    const operationPromises = documents.map(async (doc, index) => {
      for (let i = 0; i < operationsPerDocument; i++) {
        doc.text.insert(Math.floor(Math.random() * config.documentSize), 'x');
        
        // Random delay to simulate realistic usage
        await new Promise(resolve => 
          setTimeout(resolve, Math.random() * 100)
        );
      }
    });
    
    await Promise.all(operationPromises);
    
    const endTime = performance.now();
    const totalOperations = config.operationsPerSecond * config.testDuration;
    
    const finalMetrics = this.manager.getMetrics();
    
    yjsLogger.info("Stress test completed", {
      duration: endTime - startTime,
      totalOperations,
      actualThroughput: totalOperations / ((endTime - startTime) / 1000),
      ...finalMetrics
    });
    
    // Cleanup
    documents.forEach((doc, index) => 
      this.manager.removeDocument(`/stress_${index}.tex`)
    );
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize;
    }
    return 0;
  }

  /**
   * Generate performance report
   */
  generateReport(): string {
    const avgMetrics = this.calculateAverageMetrics();
    
    return `
# Performance Test Report

## Average Metrics:
- Document Load Time: ${avgMetrics.documentLoadTime.toFixed(2)}ms
- Operation Processing Time: ${avgMetrics.operationProcessingTime.toFixed(2)}ms
- Memory Usage: ${(avgMetrics.memoryUsage / 1024 / 1024).toFixed(2)}MB
- Cache Hit Rate: ${(avgMetrics.cacheHitRate * 100).toFixed(1)}%
- Throughput: ${avgMetrics.throughput.toFixed(0)} ops/sec

## Performance Assessment:
${this.assessPerformance(avgMetrics)}

## Recommendations:
${this.generateRecommendations(avgMetrics)}
    `;
  }

  private calculateAverageMetrics(): TestMetrics {
    if (this.metrics.length === 0) {
      return {
        documentLoadTime: 0,
        operationProcessingTime: 0,
        memoryUsage: 0,
        cacheHitRate: 0,
        throughput: 0
      };
    }

    const sum = this.metrics.reduce((acc, metric) => ({
      documentLoadTime: acc.documentLoadTime + metric.documentLoadTime,
      operationProcessingTime: acc.operationProcessingTime + metric.operationProcessingTime,
      memoryUsage: acc.memoryUsage + metric.memoryUsage,
      cacheHitRate: acc.cacheHitRate + metric.cacheHitRate,
      throughput: acc.throughput + metric.throughput
    }), {
      documentLoadTime: 0,
      operationProcessingTime: 0,
      memoryUsage: 0,
      cacheHitRate: 0,
      throughput: 0
    });

    const count = this.metrics.length;
    return {
      documentLoadTime: sum.documentLoadTime / count,
      operationProcessingTime: sum.operationProcessingTime / count,
      memoryUsage: sum.memoryUsage / count,
      cacheHitRate: sum.cacheHitRate / count,
      throughput: sum.throughput / count
    };
  }

  private assessPerformance(metrics: TestMetrics): string {
    const assessments = [];
    
    if (metrics.documentLoadTime < 50) {
      assessments.push("✅ Excellent document loading performance");
    } else if (metrics.documentLoadTime < 200) {
      assessments.push("⚠️ Good document loading performance");
    } else {
      assessments.push("❌ Poor document loading performance");
    }
    
    if (metrics.operationProcessingTime < 1) {
      assessments.push("✅ Excellent operation processing");
    } else if (metrics.operationProcessingTime < 5) {
      assessments.push("⚠️ Good operation processing");
    } else {
      assessments.push("❌ Poor operation processing");
    }
    
    if (metrics.memoryUsage < 50 * 1024 * 1024) { // 50MB
      assessments.push("✅ Excellent memory usage");
    } else if (metrics.memoryUsage < 100 * 1024 * 1024) { // 100MB
      assessments.push("⚠️ Good memory usage");
    } else {
      assessments.push("❌ High memory usage");
    }
    
    return assessments.join('\n');
  }

  private generateRecommendations(metrics: TestMetrics): string {
    const recommendations = [];
    
    if (metrics.documentLoadTime > 200) {
      recommendations.push("- Consider increasing cache size for better document loading performance");
    }
    
    if (metrics.operationProcessingTime > 5) {
      recommendations.push("- Optimize operation batching or increase worker pool size");
    }
    
    if (metrics.memoryUsage > 100 * 1024 * 1024) {
      recommendations.push("- Implement more aggressive cache cleanup and memory management");
    }
    
    if (metrics.cacheHitRate < 0.8) {
      recommendations.push("- Review caching strategy - low cache hit rate detected");
    }
    
    return recommendations.length > 0 ? recommendations.join('\n') : "- Performance is optimal, no recommendations needed";
  }

  /**
   * Run all performance tests
   */
  async runAllTests(): Promise<string> {
    yjsLogger.info("Starting comprehensive performance testing");
    
    await this.testDocumentLoadPerformance();
    await this.testHighFrequencyOperations();
    await this.testMemoryStress();
    
    await this.runStressTest({
      concurrentDocuments: 20,
      operationsPerSecond: 100,
      documentSize: 10000,
      testDuration: 5000 // 5 seconds
    });
    
    const report = this.generateReport();
    
    yjsLogger.info("Performance testing completed");
    
    return report;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.manager.destroy();
  }
}

/**
 * Quick performance benchmark
 */
export async function quickBenchmark(): Promise<string> {
  const test = new PerformanceTest();
  await test.initialize();
  
  const report = await test.runAllTests();
  
  test.destroy();
  
  return report;
}
