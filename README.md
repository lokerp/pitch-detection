# Karaoke Performance Test: WASM vs JS

This project compares the performance of WebAssembly (WASM) and JavaScript for vocal analysis algorithms that would be used in a karaoke application with AI-powered vocal evaluation.

## Project Structure

- `Cargo.toml` - Rust project configuration
- `src/lib.rs` - Rust implementation of vocal analysis algorithms
- `www/` - Web interface for running performance tests
  - `index.html` - Test interface
  - `index.js` - JavaScript performance testing code
  - `bootstrap.js` - WASM module loader
  - `package.json` - Node.js dependencies
  - `webpack.config.js` - Build configuration

## Vocal Analysis Functions

The project implements several vocal analysis functions that simulate the computational requirements of a karaoke application with AI vocal evaluation:

1. **Basic Vocal Analysis** - Simple algorithm for evaluating vocal performance
2. **Optimized Vocal Analysis** - More efficient algorithm using WASM capabilities
3. **Complex Vocal Analysis** - Multi-metric evaluation (pitch, rhythm, tone)
4. **Performance Test Functions** - Mathematical computations for benchmarking

## Performance Testing

The project includes comprehensive performance tests that compare:

- JavaScript implementations
- WebAssembly implementations (compiled from Rust)

Tests measure:
- Execution time for vocal analysis algorithms
- Mathematical computation performance
- String processing operations
- Memory usage patterns

## Building and Running

### Prerequisites

- Rust and Cargo (with wasm32-unknown-unknown target)
- Node.js and npm
- wasm-pack

### Setup

1. Install Rust and the wasm32-unknown-unknown target:
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   rustup target add wasm32-unknown-unknown
   ```

2. Install wasm-pack:
   ```bash
   cargo install wasm-pack
   ```

3. Build the WASM package:
   ```bash
   wasm-pack build
   ```

4. Install Node.js dependencies:
   ```bash
   cd www
   npm install
   ```

### Running

To start the development server:
```bash
cd www
npm start
```

Then open http://localhost:8080 in your browser to run the performance tests.

### Running Performance Tests

1. Click the "Run Performance Tests" button on the web interface
2. Wait for the tests to complete (may take a few seconds)
3. View the results comparing WASM and JS performance
4. The results will show performance improvements for each test category

## Performance Results

The tests will show performance comparisons between WASM and JS implementations, including:

- Execution time per function call
- Performance improvement ratios
- Accuracy verification between implementations

## Use Case for Karaoke Application

This performance testing is designed to evaluate whether WASM would be beneficial for a karaoke application that needs to:

- Process audio data in real-time
- Evaluate vocal performance with AI algorithms
- Run computations locally in the browser
- Provide immediate feedback to users

The results will help determine if WASM is worth the additional complexity for this use case.

## Troubleshooting

If you encounter issues:

1. Make sure you've built the WASM package with `wasm-pack build`
2. Ensure all dependencies are installed with `npm install` in the www directory
3. Check that you're using a modern browser that supports WebAssembly
4. Verify that the Rust toolchain is properly installed
5. If you get "address already in use" errors, kill the existing process:
   ```bash
   kill $(lsof -t -i:8080)
   ```

## Conclusion

This project demonstrates the performance benefits of using WebAssembly for computationally intensive tasks in web applications. For a karaoke application with AI vocal analysis, WASM can provide significant performance improvements while maintaining the flexibility of a web-based platform.