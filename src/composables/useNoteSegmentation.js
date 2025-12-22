import { ref, computed } from 'vue';
import { hzToContinuousMidi } from '../utils/noteUtils';

// Constants
const CONFIDENCE_THRESHOLD = 0.65;
const PITCH_CHANGE_THRESHOLD_SEMITONES = 0.75;
const MIN_NOTE_DURATION_MS = 50;
const MAX_GAP_MS_FOR_MERGE = 100;
const PITCH_DIFF_FOR_MERGE_SEMITONES = 0.5;

export function useNoteSegmentation() {
    const fullPitchHistory = ref([]);
    const segments = ref([]);

    function addHistoryPoint(timestamp, hz, confidence) {
        const continuousMidi = hzToContinuousMidi(hz);

        const point = {
            x: timestamp,
            continuousMidi: continuousMidi,
            confidence: confidence
        };

        fullPitchHistory.value.push(point);

        // Optimize: Don't re-calculate segments from scratch every frame for the entire history.
        // But for MVP porting the loop is safest to match logic.
        // To avoid performance issues with large arrays, we might throttle or optimize later.
        generateMidiSegments();
    }

    function clearHistory() {
        fullPitchHistory.value = [];
        segments.value = [];
    }

    function generateMidiSegments() {
        const history = fullPitchHistory.value;
        if (!history || history.length < 2) return;

        const potentialSegments = [];
        let currentSegmentPoints = [];
        let currentSegmentStartTime = null;

        for (let i = 0; i < history.length; i++) {
            const point = history[i];
            const isVoiced = point.confidence >= CONFIDENCE_THRESHOLD &&
                point.continuousMidi !== null &&
                Number.isFinite(point.continuousMidi);

            if (isVoiced) {
                const currentMidi = point.continuousMidi;

                if (currentSegmentPoints.length === 0) {
                    currentSegmentStartTime = point.x;
                    currentSegmentPoints.push(point);
                } else {
                    const prevMidi = currentSegmentPoints[currentSegmentPoints.length - 1].continuousMidi;
                    const pitchDiff = Math.abs(currentMidi - prevMidi);

                    if (pitchDiff > PITCH_CHANGE_THRESHOLD_SEMITONES * 0.75) {
                        // End current segment due to pitch jump
                        endCurrentSegment(potentialSegments, currentSegmentPoints, currentSegmentStartTime);

                        // Start new
                        currentSegmentStartTime = point.x;
                        currentSegmentPoints = [point];
                    } else {
                        // Continue segment
                        currentSegmentPoints.push(point);
                    }
                }
            } else {
                // Not voiced
                if (currentSegmentPoints.length > 0) {
                    endCurrentSegment(potentialSegments, currentSegmentPoints, currentSegmentStartTime);
                    currentSegmentPoints = [];
                    currentSegmentStartTime = null;
                }
            }
        }

        // Close last segment
        if (currentSegmentPoints.length > 0) {
            endCurrentSegment(potentialSegments, currentSegmentPoints, currentSegmentStartTime);
        }

        // Merge logic
        const mergedSegments = [];
        if (potentialSegments.length > 0) {
            mergedSegments.push(potentialSegments[0]);
            for (let i = 1; i < potentialSegments.length; i++) {
                const prev = mergedSegments[mergedSegments.length - 1];
                const curr = potentialSegments[i];
                const gap = curr.startTime - prev.endTime;
                const prevMidi = prev.avgContinuousMidi;
                const currMidi = curr.avgContinuousMidi;

                if (prevMidi !== null && currMidi !== null) {
                    const pitchDiff = Math.abs(currMidi - prevMidi);
                    if (gap > 0 && gap < MAX_GAP_MS_FOR_MERGE && pitchDiff < PITCH_DIFF_FOR_MERGE_SEMITONES * 0.75) {
                        // Merge
                        const totalPointsDuration = prev.duration + curr.duration;
                        const weightedAvgMidi = ((prevMidi * prev.duration) + (currMidi * curr.duration)) / totalPointsDuration;
                        const weightedAvgConfidence = ((prev.avgConfidence * prev.duration) + (curr.avgConfidence * curr.duration)) / totalPointsDuration;

                        mergedSegments[mergedSegments.length - 1] = {
                            ...prev,
                            endTime: curr.endTime,
                            duration: prev.duration + gap + curr.duration, // Include gap in duration? Or just new end - start?
                            // Logic in demo was: prev.duration + gap + curr.duration. 
                            // Which basically is curr.endTime - prev.startTime.
                            avgContinuousMidi: weightedAvgMidi,
                            avgConfidence: weightedAvgConfidence
                        };
                        continue;
                    }
                }
                mergedSegments.push(curr);
            }
        }

        segments.value = mergedSegments;
    }

    function endCurrentSegment(targetArray, points, startTime) {
        if (!points.length || startTime === null) return;

        const endTime = points[points.length - 1].x;
        const duration = endTime - startTime;

        if (duration >= MIN_NOTE_DURATION_MS) {
            const sumMidi = points.reduce((acc, p) => acc + p.continuousMidi, 0);
            const sumConfidence = points.reduce((acc, p) => acc + p.confidence, 0);

            targetArray.push({
                startTime: startTime,
                endTime: endTime,
                duration: duration,
                avgContinuousMidi: sumMidi / points.length,
                avgConfidence: sumConfidence / points.length
            });
        }
    }

    return {
        segments,
        addHistoryPoint,
        clearHistory
    };
}
