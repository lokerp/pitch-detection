<script setup>
import { ref, watch } from 'vue';
import { useWebRTC } from '../composables/useWebRTC';

const emit = defineEmits(['start', 'stop']);

const roomId = ref('karaoke-room-1'); // Default for easier testing
const { isConnected, isConnecting, error, remoteStream, startHostSession, startUserSession, cleanup} = useWebRTC();

const mode = ref(null); // 'host' or 'mic'

const startHost = () => {
    console.log('[MicrophoneSetup] Starting as Host');
    mode.value = 'host';
    startHostSession(roomId.value);
};

const startMic = () => {
    mode.value = 'mic';
    startUserSession(roomId.value);
};

const stop = () => {
    cleanup();
    mode.value = null;
    emit('stop');
};

// Expose stream to parent
watch(remoteStream, (newStream) => {
    console.log('[MicrophoneSetup] remoteStream watcher triggered', newStream);
    if (newStream && mode.value === 'host') {
        console.log('[MicrophoneSetup] Emitting start event with stream');
        emit('start', newStream);
    }
});

const audioRef = ref(null);

</script>

<template>
    <div class="p-6 bg-gray-800 rounded-xl shadow-xl border border-gray-700 max-w-md mx-auto mt-10">
        <h2 class="text-2xl font-bold mb-6 text-center bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-600">
            Device Connection
        </h2>

        <!-- Error Alert -->
        <div v-if="error" class="mb-4 p-3 bg-red-900/50 border border-red-500 rounded text-red-200 text-sm">
            {{ error }}
        </div>

        <!-- Connection Form -->
        <div v-if="!isConnected && !isConnecting">
            <div class="mb-4">
                <label class="block text-gray-400 text-sm font-bold mb-2">Room ID</label>
                <input 
                    v-model="roomId" 
                    type="text" 
                    class="w-full bg-gray-700 text-white border border-gray-600 rounded p-2 focus:outline-none focus:border-cyan-400 transition-colors"
                >
            </div>

            <div class="flex gap-4 justify-center">
                <button 
                    @click="startHost"
                    class="flex-1 px-4 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-bold transition-all transform active:scale-95"
                >
                    Start as Host
                    <div class="text-xs font-normal text-cyan-200 mt-1">(Receiver)</div>
                </button>
                <button 
                    @click="startMic"
                    class="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-500 rounded-lg font-bold transition-all transform active:scale-95"
                >
                    Start as Mic
                    <div class="text-xs font-normal text-purple-200 mt-1">(Sender)</div>
                </button>
            </div>
        </div>

        <!-- Connecting State -->
        <div v-else-if="isConnecting" class="text-center py-8">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
            <p class="text-cyan-300 animate-pulse">Connecting to {{ roomId }}...</p>
            <p class="text-xs text-gray-500 mt-2">Waiting for peer...</p>
            <button @click="stop" class="mt-6 text-gray-400 hover:text-white underline text-sm">Cancel</button>
        </div>

        <!-- Connected State -->
        <div v-else class="text-center py-6">
            <div class="w-16 h-16 bg-green-900/50 rounded-full flex items-center justify-center mx-auto mb-4 border border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.3)]">
                <svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
            </div>
            <h3 class="text-xl font-bold text-green-400 mb-1">Connected</h3>
            <p class="text-gray-400 text-sm mb-6">
                {{ mode === 'host' ? 'Listening to remote microphone...' : 'Transmitting audio...' }}
            </p>
            
            <button 
                @click="stop"
                class="px-6 py-2 bg-gray-700 hover:bg-red-900/80 hover:text-red-200 rounded-full font-bold transition-colors border border-gray-600 hover:border-red-800"
            >
                Disconnect
            </button>
        </div>
    </div>
</template>
