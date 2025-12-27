import { ref, watch } from 'vue';
import { getNoteDetails } from '../utils/noteUtils.js';

export const isRunning = ref(false);
export const currentPitch = ref(0);
export const currentNote = ref('--');
export const currentCents = ref(0);
export const confidence = ref(0);
export const volumeDb = ref(-100);
export const remoteGain = ref(1.0);

const callbacks = [];

export function onPitchUpdate(fn) {
    callbacks.push(fn);
}

let audioContext = null;
let mediaStream = null;
let workletNode = null;
let sourceNode = null;
let gainNode = null;
// Добавьте переменную на уровне модуля для хранения фиктивного элемента
let _streamKeepAliveAudio = null;

export async function startAudio(externalStream = null, enableOutput = false) {
    console.log('[audioManager] startAudio called. External stream provided:', !!externalStream);
    if (isRunning.value) {
        console.log('[audioManager] Already running, ignoring.');
        return;
    }

    try {
        console.log('[audioManager] Creating AudioContext');

        // [OPTIMIZATION 1] Настройка AudioContext для минимальной задержки
        audioContext = new (window.AudioContext || window.webkitAudioContext)({
            // 'interactive' говорит браузеру использовать минимальный буфер.
            // Можно пробовать 0, но 'interactive' стабильнее.
            latencyHint: 0.001,

            // [OPTIMIZATION 2] Согласование частоты с WebRTC (там было 48000).
            // Если частоты не совпадают, браузер делает ресемплинг (+задержка).
            sampleRate: 48000,
        });

        // Load the AudioWorklet
        await audioContext.audioWorklet.addModule('/yin-processor.js');
        console.log('[audioManager] AudioWorklet module loaded');

        // Get Microphone or External Stream
        if (externalStream) {
            mediaStream = externalStream;
            // Создаем невидимый элемент для активации потока в браузере
            if (!_streamKeepAliveAudio) {
                _streamKeepAliveAudio = new Audio();
            }
            _streamKeepAliveAudio.srcObject = mediaStream;
            // Muted = true, чтобы этот элемент не издавал звук сам, 
            // а только "качал" данные для Web Audio API
            _streamKeepAliveAudio.muted = true;

            await _streamKeepAliveAudio.play().catch(e => {
                console.warn("[audioManager] Autoplay blocked for keep-alive audio", e);
            });
        } else {
            console.log('[audioManager] Requesting local user media');
            mediaStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    autoGainControl: false,
                    noiseSuppression: false,
                    // [OPTIMIZATION 3] Аппаратная задержка
                    latency: 0,
                    channelCount: 1,
                    sampleRate: 48000 // Согласовываем частоту
                }
            });
        }

        sourceNode = audioContext.createMediaStreamSource(mediaStream);

        // Add GainNode
        gainNode = audioContext.createGain();
        gainNode.gain.value = remoteGain.value;

        workletNode = new AudioWorkletNode(audioContext, 'yin-processor', {
            // Опционально: иногда помогает задать processorOptions, 
            // но важнее настройки самого контекста выше.
        });

        workletNode.port.onmessage = (event) => {
            const { frequency, probability } = event.data;

            confidence.value = probability;
            callbacks.forEach(fn => fn(frequency, probability));

            if (probability > 0.1 && frequency > 30) {
                currentPitch.value = frequency;
                const noteInfo = getNoteDetails(frequency);
                if (noteInfo) {
                    currentNote.value = `${noteInfo.name}${noteInfo.octave}`;
                    currentCents.value = noteInfo.centsOffset;
                }
            }
        };

        // Connect graph: source -> gain -> worklet
        sourceNode.connect(gainNode);
        gainNode.connect(workletNode);

        if (enableOutput) {
            console.log('[audioManager] Enabling audio output (monitoring/routing to speakers)');
            // Прямое подключение к выходу.
            // Благодаря latencyHint: 'interactive' задержка здесь будет минимальной.
            // Connect gain -> destination
            gainNode.connect(audioContext.destination);
        }

        // Watch for gain changes
        watch(remoteGain, (newVal) => {
            if (gainNode) {
                gainNode.gain.setTargetAtTime(newVal, audioContext.currentTime, 0.1);
            }
        });

        // ВАЖНО: workletNode не подключаем к destination, 
        // так как он нужен только для анализа (Yin), а не для изменения звука.
        // Если Yin-процессор "пропускает" звук сквозь себя, то нужно подключать его,
        // но обычно анализаторы являются тупиком (destination).

        console.log('[audioManager] Audio pipeline connected and running');
        isRunning.value = true;
    } catch (error) {
        console.error("Failed to start audio:", error);
        alert("Microphone access denied or error: " + error.message);
    }
}

export function stopAudio() {
    if (!isRunning.value) return;

    if (sourceNode) sourceNode.disconnect();
    if (gainNode) {
        gainNode.disconnect();
        gainNode = null;
    }
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
