export const A4 = 440;
export const noteNames = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
export const MIDI_A4 = 69;

/** Calculates the MIDI note number from a frequency (Hz). */
export function hzToMidi(hz) {
    if (hz === null || hz <= 0) return null;
    const midiNum = MIDI_A4 + 12 * Math.log2(hz / A4);
    return Math.round(midiNum);
}

/** Calculates the continuous (non-rounded) MIDI note number from a frequency (Hz). */
export function hzToContinuousMidi(hz) {
    if (hz === null || hz <= 0) return null;
    // Same formula as hzToMidi, but without Math.round()
    return MIDI_A4 + 12 * Math.log2(hz / A4);
}

/** Converts a MIDI note number to its standard name (e.g., C4, F#5). */
export function midiToNoteName(midi) {
    if (midi === null || !Number.isFinite(midi)) return 'N/A';
    const roundedMidi = Math.round(midi);
    const octave = Math.floor(roundedMidi / 12) - 1;
    const noteIndex = roundedMidi % 12;
    return noteNames[noteIndex] + octave; // Removed the (octave) suffix style used in some debug
}

/** Calculates details about the nearest musical note for a given frequency. */
export function getNoteDetails(hz) {
    if (hz === null || hz <= 0) return null;

    // 1. Calculate the continuous MIDI note number
    const continuousMidi = hzToContinuousMidi(hz);
    if (continuousMidi === null || !Number.isFinite(continuousMidi)) return null;

    // 2. Calculate the standard MIDI note number for the detected frequency
    const roundedMidi = Math.round(continuousMidi);

    // 3. Get the note name (e.g., A, C#) WITHOUT octave for display sometimes, but here we want full name?
    // Let's return separated parts
    const octave = Math.floor(roundedMidi / 12) - 1;
    const noteIndex = roundedMidi % 12;
    const name = noteNames[noteIndex];

    // 4. Calculate the target frequency (Hz) of the *exact* nearest standard MIDI note
    const targetHz = A4 * Math.pow(2, (roundedMidi - MIDI_A4) / 12);

    // 5. Calculate the difference in cents between the detected frequency and the target frequency
    const centsOffset = 1200 * Math.log2(hz / targetHz);

    // 6. Return the details
    return {
        name,
        octave,
        targetHz,
        centsOffset: Math.round(centsOffset),
        midi: roundedMidi,
        continuousMidi
    };
}
