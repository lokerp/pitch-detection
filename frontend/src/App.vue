<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import * as audioManager from './audio/audioManager';
import { useNoteSegmentation } from './composables/useNoteSegmentation';
import PianoRoll from './components/PianoRoll.vue';
import PitchVisualizer from './components/PitchVisualizer.vue';

const { segments, fullPitchHistory, addHistoryPoint } = useNoteSegmentation();

const viewStartTime = ref(Date.now() - 5000);
const viewEndTime = ref(Date.now());

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
    } else {
        audioManager.startAudio();
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
        <button 
            @click="toggleAudio"
            class="px-6 py-2 rounded-full font-bold transition-all transform active:scale-95 shadow-lg"
            :class="audioManager.isRunning.value ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'"
        >
            {{ audioManager.isRunning.value ? 'Stop' : 'Start Microphone' }}
        </button>
    </div>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col lg:flex-row relative">
        
        <!-- Piano Roll Area -->
        <div class="flex-1 p-4 relative min-h-[400px]">
            <PianoRoll 
                :pitchData="fullPitchHistory" 
                :notes="segments" 
                :viewStartTime="viewStartTime" 
                :viewEndTime="viewEndTime"
                class="w-full h-full shadow-2xl rounded-xl border border-gray-700"
            />
        </div>

        <!-- Sidebar / Visualizer -->
        <div class="lg:w-96 bg-gray-900 p-4 border-l border-gray-800 flex flex-col justify-center gap-6">
            
            <PitchVisualizer 
                :note="audioManager.currentNote.value"
                :cents="audioManager.currentCents.value"
                :frequency="audioManager.currentPitch.value"
                :confidence="audioManager.confidence.value"
            />

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
