class YinProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        // 2048 is a good balance for detecting lower frequencies (down to ~80Hz)
        // without too much latency.
        this.bufferSize = 2048;
        this.buffer = new Float32Array(this.bufferSize);
        this.bufferIndex = 0;

        // YIN Constants
        this.threshold = 0.10; // Standard YIN threshold
        this.minFreq = 82;     // Low E guitar string ~82Hz
        this.sampleRate = 44100; // Will be updated from global scope
    }

    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || !input[0]) return true;

        const channelData = input[0];
        const inputLength = channelData.length;

        // Simple buffer filling
        for (let i = 0; i < inputLength; i++) {
            this.buffer[this.bufferIndex] = channelData[i];
            this.bufferIndex++;

            // When buffer is full, process it
            if (this.bufferIndex === this.bufferSize) {
                const result = this.detectPitch(this.buffer, sampleRate);
                this.port.postMessage(result);

                // Overlap strategy: Shift buffer by half for 50% overlap 
                // (Makes detection more responsive)
                const overlap = this.bufferSize / 2;
                this.buffer.copyWithin(0, overlap);
                this.bufferIndex = overlap;
            }
        }

        return true;
    }

    /**
     * The YIN Pitch Detection Algorithm
     */
    detectPitch(buffer, sampleRate) {
        const bufferSize = buffer.length;
        // Search range for period (tau)
        // minTau correspond to max detectable frequency
        // maxTau correspond to min detectable frequency
        const tauMin = 0; // Usually we skip the very first few
        const tauMax = bufferSize / 2;

        // 1. Difference Function (Autocorrelation-ish)
        // Using a simplified method to save CPU cycles in JS if possible, 
        // but here is the standard loop.
        const yinBuffer = new Float32Array(tauMax);

        for (let tau = tauMin; tau < tauMax; tau++) {
            let difference = 0;
            for (let i = 0; i < tauMax; i++) {
                const delta = buffer[i] - buffer[i + tau];
                difference += delta * delta;
            }
            yinBuffer[tau] = difference;
        }

        // 2. Cumulative Mean Normalized Difference Function (CMNDF)
        yinBuffer[0] = 1;
        let runningSum = 0;
        for (let tau = 1; tau < tauMax; tau++) {
            runningSum += yinBuffer[tau];
            yinBuffer[tau] *= tau / runningSum;
        }

        // 3. Absolute Threshold
        let tauEstimate = -1;
        for (let tau = 2; tau < tauMax; tau++) {
            if (yinBuffer[tau] < this.threshold) {
                while (tau + 1 < tauMax && yinBuffer[tau + 1] < yinBuffer[tau]) {
                    tau++;
                }
                tauEstimate = tau;
                break;
            }
        }

        // If no pitch found under threshold, try to find global minimum anyway
        // (Optional: can return -1 here to be strict)
        if (tauEstimate === -1) {
            let minVal = 100; // Arbitrary high value
            for (let tau = 2; tau < tauMax; tau++) {
                if (yinBuffer[tau] < minVal) {
                    minVal = yinBuffer[tau];
                    tauEstimate = tau;
                }
            }
            // If the best we found is still very bad (probability close to 0), ignore
            if (minVal > 0.4) { // 0.4 is quite loose, usually 0.15-0.2
                return { frequency: 0, probability: 0 };
            }
        }

        // 4. Parabolic Interpolation
        // Refine the peak location for better accuracy
        let betterTau = tauEstimate;
        if (tauEstimate > 0 && tauEstimate < tauMax - 1) {
            const s0 = yinBuffer[tauEstimate - 1];
            const s1 = yinBuffer[tauEstimate];
            const s2 = yinBuffer[tauEstimate + 1];
            let adjustment = (s2 - s0) / (2 * (2 * s1 - s2 - s0));
            betterTau += adjustment;
        }

        const probability = 1 - yinBuffer[tauEstimate];
        const frequency = sampleRate / betterTau;

        return { frequency, probability };
    }
}

registerProcessor('yin-processor', YinProcessor);
