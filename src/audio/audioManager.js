import { ref } from 'vue';
import { getNoteDetails } from '../utils/noteUtils.js';

export const isRunning = ref(false);
export const currentPitch = ref(0);
export const currentNote = ref('--');
export const currentCents = ref(0);
export const confidence = ref(0);
export const volumeDb = ref(-100);

const callbacks = [];

export function onPitchUpdate(fn) {
    callbacks.push(fn);
}

let audioContext = null;
let mediaStream = null;
let workletNode = null;
let sourceNode = null;

export async function startAudio() {
    if (isRunning.value) return;

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)({
            sampleRate: 44100,
        });

        // Load the AudioWorklet
        await audioContext.audioWorklet.addModule('/yin-processor.js');

        // Get Microphone
        mediaStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                autoGainControl: false,
                noiseSuppression: false,
                latency: 0
            }
        });

        sourceNode = audioContext.createMediaStreamSource(mediaStream);
        workletNode = new AudioWorkletNode(audioContext, 'yin-processor');

        workletNode.port.onmessage = (event) => {
            const { frequency, probability } = event.data;

            // Only update if confidence is decent, or decay if silence
            // We can also compute volume here if we passed buffer, but Worklet only passes result.
            // For now, let's just use probability as a proxy for "clarity".

            confidence.value = probability;

            // Notify subscribers (e.g. segmentation logic)
            callbacks.forEach(fn => fn(frequency, probability));

            if (probability > 0.1 && frequency > 30) {
                currentPitch.value = frequency;
                const noteInfo = getNoteDetails(frequency);
                if (noteInfo) {
                    currentNote.value = `${noteInfo.name}${noteInfo.octave}`;
                    currentCents.value = noteInfo.centsOffset;
                }
            } else {
                // Decay or hold? Let's hold for a bit or reset
                // For a smooth UI, maybe don't reset immediately to 0
            }
        };

        sourceNode.connect(workletNode);
        // Do not connect worklet to destination to avoid feedback loop if monitoring is off

        isRunning.value = true;
    } catch (error) {
        console.error("Failed to start audio:", error);
        alert("Microphone access denied or error: " + error.message);
    }
}

export function stopAudio() {
    if (!isRunning.value) return;

    if (sourceNode) sourceNode.disconnect();
    if (workletNode) {
        workletNode.disconnect();
        workletNode = null;
    }

    if (mediaStream) {
        mediaStream.getTracks().forEach(track => track.stop());
        mediaStream = null;
    }

    if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
        audioContext = null;
    }

    isRunning.value = false;
    currentPitch.value = 0;
    currentNote.value = '--';
    currentCents.value = 0;
    confidence.value = 0;
}
