<script setup>
import { onMounted, onUnmounted, watch, ref, computed } from 'vue';
import * as d3 from 'd3';
import { midiToNoteName } from '../utils/noteUtils';

const props = defineProps({
    notes: { type: Array, required: true },
    viewStartTime: { type: Number, required: true },
    viewEndTime: { type: Number, required: true },
    minMidiNote: { type: Number, default: 36 }, // C2
    maxMidiNote: { type: Number, default: 84 }, // C6
});

const svgRef = ref(null);
const width = ref(0);
const height = ref(0);

const KEYBOARD_WIDTH = 60;
const NOTE_HEIGHT = 12;

// Colors
const gridBackgroundColor = "#1e293b"; // slate-800
const whiteKeyColor = "#e2e8f0";     // slate-200
const blackKeyColor = "#475569";     // slate-600
const lightGridLineColor = "#334155"; // slate-700
const darkGridLineColor = "#475569";  // slate-600
const tuningLineColor = "#ffffff88";

const tuningColorScale = d3.scaleLinear()
    .domain([0, 5, 20, 40, 50])
    .range(["#4ade80", "#4ade80", "#facc15", "#fb923c", "#f87171"]) // green-400 -> yellow -> orange -> red
    .clamp(true);

function render() {
    if (!svgRef.value || width.value <= 0 || height.value <= 0) return;

    const svg = d3.select(svgRef.value);
    svg.selectAll("*").remove();

    const chartWidth = width.value - KEYBOARD_WIDTH;
    const chartHeight = height.value;

    const mainGroup = svg.append("g");
    const defs = svg.append("defs");

    // Background
    mainGroup.append("rect")
        .attr("x", KEYBOARD_WIDTH)
        .attr("y", 0)
        .attr("width", Math.max(0, chartWidth))
        .attr("height", chartHeight)
        .attr("fill", gridBackgroundColor);

    const gridGroup = mainGroup.append("g")
        .attr("transform", `translate(${KEYBOARD_WIDTH}, 0)`);

    const notesGroup = mainGroup.append("g")
        .attr("transform", `translate(${KEYBOARD_WIDTH}, 0)`);

    const keyboardGroup = mainGroup.append("g");

    // Scales
    const xScale = d3.scaleLinear()
        .domain([props.viewStartTime, props.viewEndTime])
        .range([0, chartWidth]);

    const yScale = d3.scaleLinear()
        .domain([props.minMidiNote - 0.5, props.maxMidiNote + 0.5])
        .range([chartHeight, 0]);

    const midiRange = d3.range(props.minMidiNote, props.maxMidiNote + 1);

    // --- Keyboard ---
    keyboardGroup.selectAll("rect.key")
        .data(midiRange)
        .enter()
        .append("rect")
        .attr("x", 0)
        .attr("y", d => yScale(d + 0.5))
        .attr("width", KEYBOARD_WIDTH)
        .attr("height", d => Math.abs(yScale(d - 0.5) - yScale(d + 0.5)))
        .attr("fill", d => {
            const n = d % 12;
            const isBlack = [1, 3, 6, 8, 10].includes(n);
            return isBlack ? blackKeyColor : whiteKeyColor;
        })
        .attr("stroke", "#0f172a")
        .attr("stroke-width", 1);

    keyboardGroup.selectAll("text.key-label")
        .data(midiRange.filter(d => d % 12 === 0)) // Only C notes
        .enter()
        .append("text")
        .attr("x", 40)
        .attr("y", d => yScale(d))
        .attr("dy", "0.3em")
        .attr("text-anchor", "end")
        .attr("font-size", "10px")
        .attr("fill", "#64748b")
        .text(d => midiToNoteName(d));

    // --- Grid Lines ---
    // Horizontal
    gridGroup.selectAll("line.midi-line")
        .data(midiRange)
        .enter()
        .append("line")
        .attr("x1", 0)
        .attr("x2", chartWidth)
        .attr("y1", d => yScale(d + 0.5))
        .attr("y2", d => yScale(d + 0.5))
        .attr("stroke", d => d % 12 === 0 ? darkGridLineColor : lightGridLineColor)
        .attr("stroke-width", d => d % 12 === 0 ? 1 : 0.5);

    // Vertical (Time) - Simplistic grid every 1 second
    const tickStep = 1000; // 1 sec
    const startTimeSnapped = Math.ceil(props.viewStartTime / tickStep) * tickStep;
    const timeTicks = d3.range(startTimeSnapped, props.viewEndTime, tickStep);

    gridGroup.selectAll("line.time-line")
        .data(timeTicks)
        .enter()
        .append("line")
        .attr("x1", d => xScale(d))
        .attr("x2", d => xScale(d))
        .attr("y1", 0)
        .attr("y2", chartHeight)
        .attr("stroke", lightGridLineColor)
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 4");

    // --- Notes ---
    // Filter visible notes
    const visibleNotes = props.notes.filter(n => 
        n.avgContinuousMidi !== null && 
        n.endTime >= props.viewStartTime && 
        n.startTime <= props.viewEndTime
    );

    const noteRects = notesGroup.selectAll("g.note-item")
        .data(visibleNotes)
        .enter()
        .append("g")
        .attr("class", "note-item");

    noteRects.append("rect")
        .attr("x", d => Math.max(0, xScale(d.startTime))) // Clamp to 0
        .attr("y", d => yScale(Math.round(d.avgContinuousMidi) + 0.5))
        .attr("width", d => Math.max(2, xScale(d.endTime) - Math.max(0, xScale(d.startTime))))
        .attr("height", d => Math.abs(yScale(Math.round(d.avgContinuousMidi) - 0.5) - yScale(Math.round(d.avgContinuousMidi) + 0.5)) - 1)
        .attr("rx", 3)
        .attr("fill", d => {
            const rounded = Math.round(d.avgContinuousMidi);
            const cents = (d.avgContinuousMidi - rounded) * 100;
            return tuningColorScale(Math.abs(cents));
        })
        .attr("opacity", 0.9);

    // Note Labels
    noteRects.append("text")
        .attr("x", d => Math.max(0, xScale(d.startTime)) + 4)
        .attr("y", d => yScale(Math.round(d.avgContinuousMidi)))
        .attr("dy", "0.3em")
        .attr("font-size", "10px")
        .attr("font-weight", "bold")
        .attr("fill", "#000")
        .text(d => midiToNoteName(Math.round(d.avgContinuousMidi)));
}

// Watchers
watch([
    () => props.notes, 
    () => props.viewStartTime, 
    () => props.viewEndTime, 
    width, 
    height
], () => {
    // Basic throttle? Or just render? 
    // Vue batches updates, so this shouldn't fire too insanely often, 
    // but for 60fps animation we normally use requestAnimationFrame loop.
    // However, props.viewStartTime changes every frame in parent, so specific watch triggers.
    render();
});

onMounted(() => {
    const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
           width.value = entry.contentRect.width;
           height.value = entry.contentRect.height;
        }
    });

    if (svgRef.value) {
        resizeObserver.observe(svgRef.value);
        const rect = svgRef.value.getBoundingClientRect();
        width.value = rect.width;
        height.value = rect.height;
    }

    onUnmounted(() => resizeObserver.disconnect());
});
</script>

<template>
    <div class="w-full h-full min-h-[400px] bg-slate-900 rounded-xl overflow-hidden shadow-inner border border-slate-700">
        <svg ref="svgRef" width="100%" height="100%"></svg>
    </div>
</template>
