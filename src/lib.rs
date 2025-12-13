use serde::Serialize;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

// Basic vocal analysis simulation function
#[wasm_bindgen]
pub fn analyze_vocal_performance_js(input: &str) -> f64 {
    // Simple simulation of vocal analysis in JS-like approach
    let mut score = 0.0;
    let chars: Vec<char> = input.chars().collect();

    // Simulate some processing
    for i in 0..chars.len() {
        score += (chars[i] as u32 as f64) * (i as f64).sin();
    }

    score.abs() % 100.0
}

// Optimized WASM version of vocal analysis
#[wasm_bindgen]
pub fn analyze_vocal_performance_wasm(input: &str) -> f64 {
    // More optimized version using WASM capabilities
    let bytes = input.as_bytes();
    let mut score = 0.0f64;

    // Process in chunks for better performance
    for chunk in bytes.chunks(4) {
        let mut chunk_value = 0u32;
        for (i, &byte) in chunk.iter().enumerate() {
            chunk_value |= (byte as u32) << (i * 8);
        }
        score += (chunk_value as f64).sqrt();
    }

    score % 100.0
}

// Complex vocal analysis with multiple metrics
#[wasm_bindgen]
pub fn complex_vocal_analysis(input: &str) -> JsValue {
    let pitch_accuracy = analyze_pitch(input);
    let rhythm_stability = analyze_rhythm(input);
    let tone_quality = analyze_tone(input);

    let result = VocalAnalysisResult {
        pitch_accuracy,
        rhythm_stability,
        tone_quality,
        overall_score: (pitch_accuracy + rhythm_stability + tone_quality) / 3.0,
    };

    serde_wasm_bindgen::to_value(&result).unwrap()
}

#[derive(Serialize)]
struct VocalAnalysisResult {
    pitch_accuracy: f64,
    rhythm_stability: f64,
    tone_quality: f64,
    overall_score: f64,
}

fn analyze_pitch(input: &str) -> f64 {
    // Simulate pitch analysis
    let mut total = 0u64;
    for byte in input.bytes() {
        total = total.wrapping_add(byte as u64);
    }
    (total as f64 % 100.0).abs()
}

fn analyze_rhythm(input: &str) -> f64 {
    // Simulate rhythm analysis
    let mut pattern_score = 0.0;
    let bytes = input.as_bytes();
    for i in 1..bytes.len() {
        pattern_score += ((bytes[i] as f64 - bytes[i - 1] as f64).abs() / 255.0) * 100.0;
    }
    (pattern_score / bytes.len() as f64).min(100.0)
}

fn analyze_tone(input: &str) -> f64 {
    // Simulate tone analysis
    let mut frequency_sum = 0.0;
    for (i, byte) in input.bytes().enumerate() {
        frequency_sum += (byte as f64) * (i as f64 * 0.1).sin().abs();
    }
    frequency_sum.abs() % 100.0
}

// Performance testing functions
#[wasm_bindgen]
pub fn performance_test_simple(n: usize) -> f64 {
    let mut sum = 0.0;
    for i in 0..n {
        sum += (i as f64).sqrt().sin().abs();
    }
    sum
}

#[wasm_bindgen]
pub fn performance_test_complex(n: usize) -> f64 {
    let mut sum = 0.0;
    for i in 0..n {
        let x = i as f64;
        sum += (x.sqrt() * x.sin() * x.cos() * x.tan()).abs();
    }
    sum
}

#[wasm_bindgen]
pub fn string_processing_test(input: &str, iterations: usize) -> String {
    let mut result = input.to_string();
    for _ in 0..iterations {
        result = format!("{}{}", result, result.len());
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_vocal_analysis_js() {
        let result = analyze_vocal_performance_js("test input");
        assert!(result >= 0.0 && result <= 100.0);
    }

    #[test]
    fn test_vocal_analysis_wasm() {
        let result = analyze_vocal_performance_wasm("test input");
        assert!(result >= 0.0 && result <= 100.0);
    }

    #[test]
    fn test_performance_simple() {
        let result = performance_test_simple(1000);
        assert!(result >= 0.0);
    }

    #[test]
    fn test_string_processing() {
        let result = string_processing_test("test", 3);
        assert!(!result.is_empty());
    }
}
