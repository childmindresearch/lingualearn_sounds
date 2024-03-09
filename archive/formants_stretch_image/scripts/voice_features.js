// voice_features.js
// Script to extract features from voice data.

// First Formant (F1): 
//     This usually lies in the range of 300 to 800 Hz. 
//     It is associated with vowel height (openness).
// Second Formant (F2): 
//     This typically ranges from 800 to 2200 Hz. 
//     It is related to vowel backness (front vs. back).

/*
const FormantAnalyzer = require('formantanalyzer'); //after npm installation
FormantAnalyzer.configure(launch_config);
FormantAnalyzer.LaunchAudioNodes(2, webAudioElement, call_backed_function, ['file_label'], false, false);
function Configure_FormantAnalyzer() {
    const BOX_HEIGHT = 300;
    const BOX_WIDTH = window.screen.availWidth - 50;
    document.getElementById('SpectrumCanvas').width = BOX_WIDTH;    //reset the size of canvas element
    document.getElementById('SpectrumCanvas').height = BOX_HEIGHT;
    
    let launch_config = { plot_enable: true,
    spec_type: 1,    //see below
    output_level: 2, //see below
    plot_len: 200, f_min: 50, f_max: 4000,
    N_fft_bins: 256,
    N_mel_bins: 128,
    window_width: 25, window_step: 15,
    pause_length: 200, min_seg_length: 50,
    auto_noise_gate: true, voiced_min_dB: 10, voiced_max_dB: 100,
    plot_lag: 1, pre_norm_gain: 1000, high_f_emph: 0.0,
    plot_canvas: document.querySelector('#SpectrumCanvas').getContext('2d'),
    canvas_width: BOX_WIDTH,
    canvas_height: BOX_HEIGHT };

    FormantAnalyzer.configure(launch_config);
}
*/

function extractFormants(dataArray, sampleRate) {
    const fftSize = 2048; // Example size, can be adjusted
    analyser.fftSize = fftSize;
    analyser.getFloatFrequencyData(dataArray);
    //console.log("dataArray", dataArray)

    // Identify peaks in the dataArray here
    const peaks = findPeaks(dataArray);
    //console.log("peaks", peaks)

    // Map peaks to formants (F1, F2, F3, etc.)
    const formants = mapPeaksToFormants(peaks, sampleRate, fftSize);
    //console.log("formants", formants)

    return formants;
  }
  
  function findPeaks(dataArray, threshold = -60) {
    let peaks = [];
    for (let i = 1; i < dataArray.length - 1; i++) {
        if (dataArray[i] > threshold && dataArray[i] > dataArray[i - 1] && dataArray[i] > dataArray[i + 1]) {
            peaks.push({ position: i, value: dataArray[i] });
        }
    }
    return peaks;
  }
  
  function mapPeaksToFormants(peaks, sampleRate, fftSize) {
    // Convert peak positions to frequencies
    let formants = peaks.map(peak => {
        const frequency = (peak.position * sampleRate) / (fftSize);
        return { frequency: frequency, value: peak.value };
    });

    // Sort formants by frequency
    formants.sort((a, b) => a.frequency - b.frequency);

    // Filter to find the first and second formants
    let F1 = formants.find(f => f.frequency >= 300 && f.frequency <= 800);
    let F2 = formants.find(f => f.frequency >= 800 && f.frequency <= 2200);

    // Check if F1 and F2 are undefined and handle accordingly
    F1 = F1 || { frequency: null, value: null };
    F2 = F2 || { frequency: null, value: null };

    return { F1, F2 };
  } 

  function calculateRMS(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += (data[i] - 128) ** 2; // Data is unsigned byte; 128 is the zero level
    }
    return Math.sqrt(sum / data.length);
}

function detectPitch(dataArray) {
    // Implement a basic pitch detection algorithm
    // This is a placeholder and needs a proper implementation
    let sum = 0;
    for (let i = 0; i < dataArray.length; i++) {
        sum += dataArray[i];
    }
    return sum / dataArray.length; // Placeholder calculation
}

function detectVolume(data) {
    let sum = 0;
    for (let i = 0; i < data.length; i++) {
        sum += data[i];
    }
    return sum / data.length;
}

function detectFrequencySpectrum(data) {
    // Perform a Fourier Transform to convert time-domain data to frequency-domain
    // This is a placeholder - a real implementation is more complex
    return data; // Placeholder array of frequency intensities
}
function detectRhythm(data) {
    // Analyze the waveform to find rhythmic patterns
    // This is a simplified placeholder
    return "rhythm pattern"; // Placeholder string representing the rhythm
}

function analyzeWaveform(data) {
    // Analyze the shape of the waveform
    // Placeholder for waveform analysis
    return "waveform characteristics"; // Placeholder string representing waveform shape
}

