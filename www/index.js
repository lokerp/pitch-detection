import {
    analyze_vocal_performance_js, analyze_vocal_performance_wasm,
    complex_vocal_analysis, performance_test_simple,
    performance_test_complex, string_processing_test
} from "karaoke-performance-test";

// Performance testing functions
function timeFunction(fn, iterations = 1000) {
    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
        fn();
    }
    const end = performance.now();
    return (end - start) / iterations;
}

// JavaScript equivalent functions for comparison
function analyzeVocalPerformanceJS(input) {
    let score = 0.0;
    const chars = Array.from(input);

    for (let i = 0; i < chars.length; i++) {
        score += (chars[i].charCodeAt(0) * Math.sin(i));
    }

    return Math.abs(score) % 100.0;
}

function analyzeVocalPerformanceWASM(input) {
    // JavaScript version of the WASM algorithm
    const bytes = new TextEncoder().encode(input);
    let score = 0.0;

    for (let i = 0; i < bytes.length; i += 4) {
        let chunkValue = 0;
        for (let j = 0; j < 4 && (i + j) < bytes.length; j++) {
            chunkValue |= (bytes[i + j] << (j * 8));
        }
        score += Math.sqrt(chunkValue);
    }

    return score % 100.0;
}

function performanceTestSimple(n) {
    let sum = 0.0;
    for (let i = 0; i < n; i++) {
        sum += Math.abs(Math.sqrt(i) * Math.sin(i));
    }
    return sum;
}

function performanceTestComplex(n) {
    let sum = 0.0;
    for (let i = 0; i < n; i++) {
        const x = i;
        sum += Math.abs(Math.sqrt(x) * Math.sin(x) * Math.cos(x) * Math.tan(x));
    }
    return sum;
}

function stringProcessingTest(input, iterations) {
    let result = input;
    for (let i = 0; i < iterations; i++) {
        result = result + result.length;
    }
    return result;
}

// Format results for display
function formatResults(results) {
    let output = "=== Performance Test Results ===\n\n";

    output += "Vocal Analysis Performance:\n";
    output += `  JS Vocal Analysis: ${results.jsVocalTime.toFixed(4)} ms per call\n`;
    output += `  WASM Vocal Analysis (JS-style): ${results.wasmVocalTime.toFixed(4)} ms per call\n`;
    output += `  WASM Vocal Analysis (Optimized): ${results.wasmOptimizedTime.toFixed(4)} ms per call\n`;
    output += `  Improvement: ${(results.jsVocalTime / results.wasmOptimizedTime).toFixed(2)}x faster\n\n`;

    output += "Mathematical Performance:\n";
    output += `  JS Math Performance: ${results.jsMathTime.toFixed(4)} ms per call\n`;
    output += `  WASM Math Performance: ${results.wasmMathTime.toFixed(4)} ms per call\n`;
    output += `  Improvement: ${(results.jsMathTime / results.wasmMathTime).toFixed(2)}x faster\n\n`;

    output += "String Processing Performance:\n";
    output += `  JS String Processing: ${results.jsStringTime.toFixed(4)} ms per call\n`;
    output += `  WASM String Processing: ${results.wasmStringTime.toFixed(4)} ms per call\n`;
    output += `  Improvement: ${(results.jsStringTime / results.wasmStringTime).toFixed(2)}x faster\n\n`;

    output += "Complex Analysis Performance:\n";
    output += `  JS Complex Analysis: ${results.jsComplexTime.toFixed(4)} ms per call\n`;
    output += `  WASM Complex Analysis: ${results.wasmComplexTime.toFixed(4)} ms per call\n`;
    output += `  Improvement: ${(results.jsComplexTime / results.wasmComplexTime).toFixed(2)}x faster\n\n`;

    output += "Accuracy Verification:\n";
    output += `  JS Algorithm Result: ${results.jsResult.toFixed(4)}\n`;
    output += `  WASM Algorithm Result: ${results.wasmResult.toFixed(4)}\n`;
    output += `  Difference: ${results.difference.toFixed(4)}\n\n`;

    output += "=== Summary ===\n";
    output += "WASM provides significant performance improvements for computationally intensive tasks.\n";
    output += "For vocal analysis in a karaoke application, WASM would be beneficial for real-time processing.\n";

    return output;
}

// Run performance tests
function runPerformanceTests() {
    const statusElement = document.getElementById('status');
    const resultsElement = document.getElementById('results');

    statusElement.style.display = 'block';
    resultsElement.innerHTML = "Running performance tests...";

    try {
        const testInput = "This is a test input for vocal analysis performance testing with a reasonably long string to process";
        const iterations = 10000;

        // Test vocal analysis functions
        const jsVocalTime = timeFunction(() => analyzeVocalPerformanceJS(testInput), 1000);
        const wasmVocalTime = timeFunction(() => analyze_vocal_performance_js(testInput), 1000);
        const wasmOptimizedTime = timeFunction(() => analyze_vocal_performance_wasm(testInput), 1000);

        // Test mathematical performance
        const jsMathTime = timeFunction(() => performanceTestSimple(1000), 1000);
        const wasmMathTime = timeFunction(() => performance_test_simple(1000), 1000);

        // Test string processing
        const jsStringTime = timeFunction(() => stringProcessingTest("test", 100), 1000);
        const wasmStringTime = timeFunction(() => string_processing_test("test", 100), 1000);

        // Test complex analysis
        const jsComplexTime = timeFunction(() => performanceTestComplex(100), 1000);
        const wasmComplexTime = timeFunction(() => performance_test_complex(100), 1000);

        // Test accuracy
        const jsResult = analyzeVocalPerformanceWASM(testInput);
        const wasmResult = analyze_vocal_performance_wasm(testInput);
        const difference = Math.abs(jsResult - wasmResult);

        // Compile results
        const results = {
            jsVocalTime,
            wasmVocalTime,
            wasmOptimizedTime,
            jsMathTime,
            wasmMathTime,
            jsStringTime,
            wasmStringTime,
            jsComplexTime,
            wasmComplexTime,
            jsResult,
            wasmResult,
            difference
        };

        // Display results
        resultsElement.innerHTML = formatResults(results);
        statusElement.className = 'completed';
        statusElement.innerHTML = 'Tests completed successfully!';

        // Update button
        document.getElementById('runTests').innerHTML = 'Run Performance Tests Again';
    } catch (error) {
        resultsElement.innerHTML = `Error running tests: ${error.message}`;
        statusElement.className = 'loading';
        statusElement.innerHTML = 'Error occurred';
    }
}

// Set up event listener
window.onload = function () {
    document.getElementById('runTests').onclick = runPerformanceTests;
};