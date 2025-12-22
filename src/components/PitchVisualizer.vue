<script setup>
import { computed } from 'vue';

const props = defineProps({
  note: { type: String, default: '--' }, // e.g. "A4" or "--"
  cents: { type: Number, default: 0 },
  frequency: { type: Number, default: 0 },
  confidence: { type: Number, default: 0 }
});

const barWidth = computed(() => {
    // scale -50 to +50 cents to 0-100%
    // 0 cents = 50%
    const cl = Math.max(-50, Math.min(50, props.cents));
    return ((cl + 50) / 100) * 100 + '%';
});

const isSharp = computed(() => props.cents > 10);
const isFlat = computed(() => props.cents < -10);
const isInTune = computed(() => Math.abs(props.cents) <= 10);

const colorClass = computed(() => {
    if (isInTune.value) return 'text-green-400';
    if (Math.abs(props.cents) < 25) return 'text-yellow-400';
    return 'text-red-400';
});
</script>

<template>
  <div class="bg-gray-800 rounded-xl p-6 shadow-lg text-center w-full max-w-md mx-auto border border-gray-700">
    <!-- Note Display -->
    <div class="mb-4">
      <h2 class="text-xs uppercase tracking-widest text-gray-500 mb-1">Detected Note</h2>
      <div 
        class="text-8xl font-black bg-clip-text text-transparent bg-gradient-to-br from-white to-gray-400 transition-all duration-100"
        :class="colorClass"
      >
        {{ note }}
      </div>
    </div>

    <!-- Cents / Tuning -->
    <div class="mb-6">
        <div class="text-xl font-mono mb-2" :class="colorClass">
            <span v-if="cents > 0">+</span>{{ cents }} cents
        </div>
        
        <!-- Tuning Meter -->
        <div class="relative w-full h-4 bg-gray-700 rounded-full overflow-hidden">
            <!-- Center marker -->
            <div class="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white opacity-50 z-10"></div>
            
            <!-- Moving marker -->
            <div 
                class="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_white] transition-all duration-100 ease-out"
                :style="{ left: barWidth }"
            ></div>
            
            <!-- Fill gradient based on tune -->
            <div 
                class="absolute top-0 bottom-0 left-0 right-0 opacity-30"
                :class="{
                    'bg-green-500': isInTune,
                    'bg-yellow-500': !isInTune && Math.abs(cents) < 25,
                    'bg-red-500': Math.abs(cents) >= 25
                }"
            ></div>
        </div>
    </div>

    <!-- Stats Grid -->
    <div class="grid grid-cols-2 gap-4">
        <div class="bg-gray-700/50 p-3 rounded-lg">
            <div class="text-xs text-gray-400 uppercase">Frequency</div>
            <div class="text-xl font-mono text-cyan-300">{{ frequency.toFixed(1) }} Hz</div>
        </div>
        <div class="bg-gray-700/50 p-3 rounded-lg">
            <div class="text-xs text-gray-400 uppercase">Confidence</div>
            <div class="text-xl font-mono text-emerald-300">{{ (confidence * 100).toFixed(0) }}%</div>
        </div>
    </div>
  </div>
</template>
