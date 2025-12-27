<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as audioManager from './audio/audioManager';
import { useNoteSegmentation } from './composables/useNoteSegmentation';
// import PianoRoll from './components/PianoRoll.vue';
// import PitchVisualizer from './components/PitchVisualizer.vue';
import MicrophoneSetup from './components/MicrophoneSetup.vue';

const { segments, fullPitchHistory, addHistoryPoint } = useNoteSegmentation();

const viewStartTime = ref(Date.now() - 5000);
const viewEndTime = ref(Date.now());
// State for P2P
const isRemoteAudio = ref(false);

// Hook audio updates to segmentation history
audioManager.onPitchUpdate((hz, prob) => {
    addHistoryPoint(Date.now(), hz, prob);
});

// Animation loop for scrolling the piano roll
let animationFrame;
function updateTime() {
    if (audioManager.isRunning.value) {
        const now = Date.now();
        viewEndTime.value = now;
        viewStartTime.value = now - 5000; // 5 second window
    }
    animationFrame = requestAnimationFrame(updateTime);
}

onMounted(() => {
    updateTime();
});

onUnmounted(() => {
    cancelAnimationFrame(animationFrame);
});

function toggleAudio() {
    if (audioManager.isRunning.value) {
        audioManager.stopAudio();
        isRemoteAudio.value = false;
    } else {
        audioManager.startAudio(); 
    }
}

function onRemoteStart(stream) {
    if (audioManager.isRunning.value) {
        audioManager.stopAudio();
    }
    audioManager.startAudio(stream, true);
    isRemoteAudio.value = true;
}

function onRemoteStop() {
    if (audioManager.isRunning.value && isRemoteAudio.value) {
        audioManager.stopAudio();
        isRemoteAudio.value = false;
    }
}
</script>

<template>
  <div class="h-screen bg-gray-900 text-white flex flex-col overflow-hidden font-sans">
    <!-- Header / Controls -->
    <div class="p-4 bg-gray-800 shadow-md flex items-center justify-between z-10">
        <h1 class="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
            🎵 YIN Pitch Detector (Vue + AudioWorklet)
        </h1>
        <div class="flex items-center gap-4">
            <div v-if="isRemoteAudio" class="flex items-center gap-2 bg-gray-700/50 px-3 py-1 rounded-full border border-gray-600">
                 <div class="px-2 py-0.5 bg-purple-900/50 border border-purple-500 rounded text-xs text-purple-200 animate-pulse whitespace-nowrap">
                    Remote Active
                </div>
                <div class="flex items-center gap-2">
                    <span class="text-xs text-gray-300">Volume: {{ (audioManager.remoteGain.value * 100).toFixed(0) }}%</span>
                    <input 
                        type="range" 
                        min="0" 
                        max="5" 
                        step="0.1" 
                        v-model.number="audioManager.remoteGain.value"
                        class="w-24 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-purple-500"
                    />
                </div>
            </div>
            <button 
                @click="toggleAudio"
                class="px-6 py-2 rounded-full font-bold transition-all transform active:scale-95 shadow-lg"
                :class="audioManager.isRunning.value ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'"
            >
                {{ audioManager.isRunning.value ? 'Stop' : 'Start Local Mic' }}
            </button>
        </div>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col lg:flex-row relative">
        
        <!-- Piano Roll Area -->
        <div class="flex-1 p-4 relative min-h-[400px] flex flex-col">
            <!-- Connection Setup Overlay or Embedded -->
            <div class="mb-4">
                <MicrophoneSetup @start="onRemoteStart" @stop="onRemoteStop" />
            </div>

            <!-- <PianoRoll 
                :pitchData="fullPitchHistory" 
                :notes="segments" 
                :viewStartTime="viewStartTime" 
                :viewEndTime="viewEndTime"
                class="flex-1 w-full shadow-2xl rounded-xl border border-gray-700"
            /> -->
        </div>

        <!-- Sidebar / Visualizer -->
        <div class="lg:w-96 bg-gray-900 p-4 border-l border-gray-800 flex flex-col justify-center gap-6">
            
            <!-- <PitchVisualizer 
                :note="audioManager.currentNote.value"
                :cents="audioManager.currentCents.value"
                :frequency="audioManager.currentPitch.value"
                :confidence="audioManager.confidence.value"
            /> -->

            <div class="bg-gray-800 p-4 rounded-xl text-sm text-gray-400">
                <h3 class="font-bold text-gray-300 mb-2">Instructions</h3>
                <ul class="list-disc pl-4 space-y-1">
                    <li>Click "Start Microphone" above.</li>
                    <li>Sing or play an instrument.</li>
                    <li>Watch the Piano Roll populate in real-time.</li>
                    <li>Ensure you are in a quiet environment.</li>
                </ul>
            </div>
        </div>

    </div>
  </div>
</template>
