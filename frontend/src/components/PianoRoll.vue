<script setup>
import { onMounted, onUnmounted, watch, ref, toRefs } from 'vue';
import { midiToNoteName } from '../utils/noteUtils';

const props = defineProps({
    pitchData: { type: Array, required: true }, // Array of {x: timestamp, continuousMidi: number, confidence: number}
    // notes are optional now, mostly for reference if needed, but per request we focus on "pitch ball"
    notes: { type: Array, default: () => [] }, 
    viewStartTime: { type: Number, required: true },
    viewEndTime: { type: Number, required: true },
    minMidiNote: { type: Number, default: 36 }, // C2
    maxMidiNote: { type: Number, default: 84 }, // C6
});

const canvasRef = ref(null);
const width = ref(0);
const height = ref(0);

const KEYBOARD_WIDTH = 60;
const TIME_LABEL_HEIGHT = 20;

// Colors
const gridBackgroundColor = "#1e293b"; // slate-800
const whiteKeyColor = "#e2e8f0";     // slate-200
const blackKeyColor = "#475569";     // slate-600
const lightGridLineColor = "#334155"; // slate-700
const darkGridLineColor = "#475569";  // slate-600
const ballColor = "#4ade80"; // green-400
const trailColor = "#4ade80aa"; 

// Helper to confirm black keys
function isBlackKey(midi) {
    const n = midi % 12;
    return [1, 3, 6, 8, 10].includes(n);
}

// Scales
function getX(time) {
    const range = props.viewEndTime - props.viewStartTime;
    if (range <= 0) return KEYBOARD_WIDTH;
    const chartWidth = width.value - KEYBOARD_WIDTH;
    const normalized = (time - props.viewStartTime) / range;
    return KEYBOARD_WIDTH + normalized * chartWidth;
}

function getY(midi) {
    // Top is maxMidi, Bottom is minMidi
    const range = props.maxMidiNote - props.minMidiNote + 1;
    const chartHeight = height.value;
    // Normalized 0 to 1 (0 = min, 1 = max)
    const normalized = (midi - props.minMidiNote + 0.5) / range;
    // Invert because Y grows down
    return chartHeight - (normalized * chartHeight);
}

function render() {
    const canvas = canvasRef.value;
    if (!canvas || width.value <= 0 || height.value <= 0) return;
    const ctx = canvas.getContext('2d');
    
    // Clear
    ctx.fillStyle = gridBackgroundColor;
    ctx.fillRect(0, 0, width.value, height.value);

    const chartWidth = width.value - KEYBOARD_WIDTH;
    const chartHeight = height.value;

    // --- Grid & Keyboard ---
    const midiRangeCount = props.maxMidiNote - props.minMidiNote + 1;
    const keyHeight = chartHeight / midiRangeCount;

    // Draw Keys and Grid Lines
    for (let i = 0; i < midiRangeCount; i++) {
        const midi = props.minMidiNote + i;
        const y = getY(midi + 0.5); // Top of the key (mathematically max Y for this key)
        // Actually getY returns center or specific point. Let's use strict grid math.
        // yBottom is getY(midi - 0.5), yTop is getY(midi + 0.5)
        // Canvas Y 0 is top. 
        // Logic: 
        // slot i=0 (minMidi) corresponds to bottom of screen.
        
        // Let's rely on getY for center, and keyHeight.
        const center_y = getY(midi);
        const top_y = center_y - keyHeight / 2;
        
        // 1. Keyboard Key
        ctx.fillStyle = isBlackKey(midi) ? blackKeyColor : whiteKeyColor;
        ctx.fillRect(0, top_y, KEYBOARD_WIDTH, keyHeight);
        
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 1;
        ctx.strokeRect(0, top_y, KEYBOARD_WIDTH, keyHeight);

        // Label C notes
        if (midi % 12 === 0) {
            ctx.fillStyle = "#64748b";
            ctx.font = "10px sans-serif";
            ctx.textAlign = "right";
            ctx.fillText(midiToNoteName(midi), KEYBOARD_WIDTH - 4, center_y + 3);
        }

        // 2. Horizontal Grid Line
        // Draw line at the boundary (top of this key, which is bottom of next)
        // Actually we typically want lines between keys. 
        // Top of this key is top_y.
        ctx.beginPath();
        ctx.moveTo(KEYBOARD_WIDTH, top_y);
        ctx.lineTo(width.value, top_y);
        ctx.strokeStyle = (midi % 12 === 0) ? darkGridLineColor : lightGridLineColor;
        ctx.lineWidth = (midi % 12 === 0) ? 1 : 0.5;
        ctx.stroke();
    }

    // Vertical Time Grid (every 1 sec)
    const tickStep = 1000; 
    const startTimeSnapped = Math.ceil(props.viewStartTime / tickStep) * tickStep;
    
    ctx.strokeStyle = lightGridLineColor;
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.textAlign = "left";
    
    for (let t = startTimeSnapped; t < props.viewEndTime; t += tickStep) {
        const x = getX(t);
        if (x >= KEYBOARD_WIDTH) {
            ctx.beginPath();
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height.value);
            ctx.stroke();
        }
    }
    ctx.setLineDash([]);


    // --- Pitch Trail ---
    // Draw lines connecting points
    if (props.pitchData.length > 2) {
        ctx.beginPath();
        let started = false;

        // Filter valid visible points to optimize?
        // Or just iterate. History can be large, but we only care about [viewStartTime, viewEndTime].
        // Assuming pitchData is sorted by time.
        
        // Binary search or just iterate if not huge. Let's iterate for MVP.
        let firstPoint = true;
        
        for (const p of props.pitchData) {
            // Optimization: Skip if way before viewStartTime (allow some buffer for line drawing)
            if (p.x < props.viewStartTime - 1000) continue; 
            if (p.x > props.viewEndTime + 100) break;

            if (p.continuousMidi === null || p.confidence < 0.5) { // Simple threshold check
                // Break the line if voice lost
                firstPoint = true; 
                continue;
            }

            const x = getX(p.x);
            const y = getY(p.continuousMidi);

            if (firstPoint) {
                ctx.moveTo(x, y);
                firstPoint = false;
            } else {
                ctx.lineTo(x, y);
            }
        }
        
        ctx.strokeStyle = trailColor;
        ctx.lineWidth = 3;
        ctx.stroke();
    }

    // --- Pitch Ball (Current Note) ---
    // Find the latest valid pitch point
    // We can just look at the last few points
    let lastPoint = null;
    for (let i = props.pitchData.length - 1; i >= 0; i--) {
        if (props.pitchData[i].continuousMidi !== null && props.pitchData[i].confidence > 0.5) {
            lastPoint = props.pitchData[i];
            break;
        }
    }

    if (lastPoint && lastPoint.x > props.viewEndTime - 200) { // Only show if recent
        const x = getX(lastPoint.x);
        const y = getY(lastPoint.continuousMidi);

        // Draw Glow
        const gradient = ctx.createRadialGradient(x, y, 2, x, y, 10);
        gradient.addColorStop(0, ballColor);
        gradient.addColorStop(1, "transparent");
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(x, y, 10, 0, Math.PI * 2);
        ctx.fill();

        // Draw Core
        ctx.fillStyle = "#ffffff";
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Optional Label next to ball
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px sans-serif";
        ctx.fillText(midiToNoteName(Math.round(lastPoint.continuousMidi)), x + 12, y + 4);
    }
}

let animationFrameId;
function loop() {
    render();
    animationFrameId = requestAnimationFrame(loop);
}

// Watch dimensions
onMounted(() => {
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
           // Set internal resolution match CSS pixels for sharpness (DPI fix can be added, but MVP 1:1)
           // Actually Canvas 'width' attr is resolution, style width is size. 
           // We need to set width/height attrs to pixel size.
           const rect = entry.contentRect;
           width.value = rect.width;
           height.value = rect.height;
           if (canvasRef.value) {
               canvasRef.value.width = rect.width;
               canvasRef.value.height = rect.height;
           }
        }
    });

    if (canvasRef.value) {
        resizeObserver.observe(canvasRef.value.parentElement);
    }

    loop();

    onUnmounted(() => {
        cancelAnimationFrame(animationFrameId);
        resizeObserver.disconnect();
    });
});

</script>

<template>
    <!-- Use a wrapper for resizing -->
    <div class="relative w-full h-full bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700">
        <canvas ref="canvasRef" class="block w-full h-full"></canvas>
    </div>
</template>
