// script.js
/* Script that uses tensorflow model to provide real-time feedback about pronunciation.
   Feedback is in the form of modified plot markers and stretched images.
*/

// Define global variables
//let audioContext;
//let analyser;
//let microphone;
let isListening = false;
let currentWordIndex = -1;
let markerRadius = 11; // copied from style.css
let plotWidth = 800; // copied from style.css
let plotHeight = 100; // copied from style.css
let numberOfVerticalLines = 15;
let numberOfHorizontalLines = 7;
let xSpacing = plotWidth / numberOfVerticalLines;
let ySpacing = plotHeight / numberOfHorizontalLines;
let imageSize = 400;
const modelURL = "https://teachablemachine.withgoogle.com/models/g26KsVfaq/"; // Teachable Machine tensorflow model
const sampleRate = 44100;

// Words
const words = [
    { word: "beet", format: "b<span class='highlighted'>ee</span>t", vowel: "IY" }, 
    { word: "bit", format: "b<span class='highlighted'>i</span>t", vowel: "IH" }, 
    { word: "bet", format: "b<span class='highlighted'>e</span>t", vowel: "EH" },
    { word: "bat", format: "b<span class='highlighted'>a</span>t", vowel: "AE" },
    { word: "bot", format: "b<span class='highlighted'>o</span>t", vowel: "AA" },
    { word: "but", format: "b<span class='highlighted'>u</span>t", vowel: "AH" },
    { word: "book", format: "b<span class='highlighted'>oo</span>k", vowel: "UH" },
    { word: "boot", format: "b<span class='highlighted'>oo</span>t", vowel: "UW" },
    { word: "bought", format: "b<span class='highlighted'>ough</span>t", vowel: "AO" } 
];

// Vowels and their (zero-index) positions in the IPA chart
const vowels = [
    { vowel: "IY", position: { x: 0, y: 0 } }, 
    { vowel: "IH", position: { x: 3, y: 1 } }, 
    { vowel: "EH", position: { x: 4, y: 4 } },
    { vowel: "AE", position: { x: 5, y: 5 } },
    { vowel: "AA", position: { x: 6, y: 6 } },
    { vowel: "AH", position: { x: 12, y: 4 } },
    { vowel: "UH", position: { x: 11, y: 1 } },
    { vowel: "UW", position: { x: 14, y: 0 } },
    { vowel: "AO", position: { x: 14, y: 4 } } 
];

// https://github.com/tensorflow/tfjs-models/tree/master/speech-commands
async function createModel() {
    const checkpointURL = modelURL + "model.json"; // model topology
    const metadataURL = modelURL + "metadata.json"; // model metadata

    const recognizer = speechCommands.create(
        "BROWSER_FFT", // fourier transform type, not useful to change
        undefined, // speech commands vocabulary feature, not useful for your models
        checkpointURL,
        metadataURL);

    // check that model and metadata are loaded via HTTPS requests.
    await recognizer.ensureModelLoaded();

    return recognizer;
}

async function init() {
    // Create an AudioContext with the desired sample rate.
    const audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: sampleRate });

    this.sampleRateHz = audioContext.sampleRate; // This will be 44100 if the browser supports setting the sample rate
    //console.log("Value of sampleRateHz:", this.sampleRateHz);
    //console.log("Value of audioContext sample rate:", audioContext.sampleRate);

    // Access the user's microphone and create a source node
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const source = audioContext.createMediaStreamSource(stream);

    // Additional setup for the recognizer here
    const recognizer = await createModel();

    // Adjust recognizer's audio processing to use the audio context
    recognizer.ensureModelLoaded().then(() => {
        // listen() takes two arguments:
        // 1. A callback function that is invoked anytime a word is recognized.
        // 2. A configuration object with adjustable fields
        recognizer.listen(result => {
            vowels.forEach(vowel => {
                const marker = document.getElementById('marker-' + vowel.vowel);
                if (marker) {
                    const index = classLabels.indexOf(vowel.vowel); // Assuming classLabels matches vowel.vowel
                    const score = result.scores[index];
                    marker.style.backgroundColor = scoreToColor(score); // Fill color based on score
                }
            });
        }, {
            includeSpectrogram: true, // in case listen should return result.spectrogram
            probabilityThreshold: 0.75,
            invokeCallbackOnNoiseAndUnknown: true,
            overlapFactor: 0.50
        });
    });
    const classLabels = recognizer.wordLabels(); // get class labels
}

// Function to map a score to a color
// Interpolate between light gray for low score and red for high score
function scoreToColor(score) {
    // Convert score to a percentage
    const percent = Math.max(0, Math.min(1, score)); // Ensure percent is between 0 and 1
    const r = Math.floor((234 - 211) * percent + 211); // Interpolating R value
    const g = Math.floor((35 - 211) * percent + 211);  // Interpolating G value
    const b = Math.floor((75 - 211) * percent + 211);  // Interpolating B value
    //console.log(score, r, g, b);
    return `rgb(${r},${g},${b})`;
}

// Function to initialize the plot with marker and marker
function initializePlot() {
    let plotArea = document.getElementById('plot-area');
    plotArea.innerHTML = ''; // Clear existing elements in the plot area
    drawGrid();
    //addAxisLabels();
}

// Function to display the next word, etc.
function updateDisplay() {
    //currentWordIndex = Math.floor(Math.random() * words.length);
    currentWordIndex = (currentWordIndex + 1) % words.length;
    let currentWord = words[currentWordIndex].word;
    let currentFormattedWord = words[currentWordIndex].format;
    document.getElementById('word-display').innerHTML = currentFormattedWord;

    // Create markers for all of the vowels
    vowels.forEach(vowel => {
        // Use the position from the vowels array to position the circle
        let markerPosition = { x: xSpacing * vowel.position.x + xSpacing/2 - markerRadius/2, y: ySpacing * vowel.position.y + ySpacing/2 - markerRadius/2 };
        createMarker(vowel.vowel, markerPosition, '#d3d3d3', vowel.vowel === words[currentWordIndex].vowel ? '#ea234b' : '#d3d3d3');
    });

    // Update the image source
    let fixedImage = document.getElementById('word-image-fixed'); // Get the fixed image element
    let stretchableImage = document.getElementById('word-image-stretch'); // Get the stretchable image element
    fixedImage.style.display = 'block'; // Set the display property to make it visible
    stretchableImage.style.display = 'block'; // Set the display property to make it visible
    fixedImage.src = stretchableImage.src = 'assets/pictures/' + currentWord + '.png'; // Set the source of the image

    // Ensure both images start with the same size
    fixedImage.style.width = stretchableImage.style.width = imageSize + 'px';
    fixedImage.style.height = stretchableImage.style.height = imageSize + 'px';

    return vowels[currentWordIndex].position; // Return the position of the new word's vowel
}

// Function to create marker
function createMarker(vowel, position, backgroundColor, borderColor) {
    let marker = document.getElementById('marker-' + vowel);
    if (!marker) { // Create only if it doesn't exist
        marker = document.createElement('div');
        marker.id = 'marker-' + vowel;
        marker.className = 'marker';
        document.getElementById('plot-area').appendChild(marker);
    }
    // Set or update the marker's styles
    marker.style.backgroundColor = backgroundColor;
    marker.style.borderColor = borderColor;
    marker.style.left = `${position.x}px`;
    marker.style.top = `${position.y}px`;
}

// Function to update the marker position
/*function updateMarkerPosition(features) {
    // Normalize x and y values to fit within the plot area
    //console.log("features.x: ", features.x)
    //console.log("features.y: ", features.y)
    let normalizedX = normalizeValue(features.x, minX, maxX, 0, plotWidth);
    let normalizedY = normalizeValue(features.y, minY, maxY, 0, plotHeight);
    //console.log("normalizedX: ", normalizedX)
    //console.log("normalizedY: ", normalizedY)

    // Update marker position
    let marker = document.getElementById('moving-circle');
    marker.style.left = normalizedX + 'px';
    marker.style.top = normalizedY + 'px';

    // Get marker position
    let marker = document.getElementById('marker');
    let markerX = parseInt(marker.style.left, 10);
    let markerY = parseInt(marker.style.top, 10);

    // Update stretching image size based on marker position
    let stretchableImage = document.getElementById('word-image-stretch');
    stretchableImage.style.width = calculateImageWidth(normalizedX, markerX, imageSize, plotWidth) + 'px';
    stretchableImage.style.height = calculateImageHeight(normalizedY, markerY, imageSize, plotHeight) + 'px';
}
function normalizeValue(value, minInput, maxInput, minOutput, maxOutput) {
    // Normalize a value from one range to another
    return ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;
}

function calculateImageWidth(markerX, markerX, plotWidth) {
    let deltaX = markerX - markerX;
    let initialWidth = imageSize;
    let stretchFactorX = Math.abs(deltaX) / (plotWidth / 2); // Factor by which to stretch
    console.log(stretchFactorX);

    // Expand or contract based on marker position relative to marker
    return deltaX > 0 ? initialWidth * (1 + stretchFactorX) : initialWidth * (1 - stretchFactorX);
}

function calculateImageHeight(markerY, markerY, plotHeight) {
    let deltaY = markerY - markerY;
    let initialHeight = imageSize;
    let stretchFactorY = Math.abs(deltaY) / (plotHeight / 2); // Factor by which to stretch

    // Expand or contract based on marker position relative to marker
    return deltaY > 0 ? initialHeight * (1 + stretchFactorY) : initialHeight * (1 - stretchFactorY);
}

// Define a function to calculate the distance between two points
function calculateDistance(pos1, pos2) {
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
}
// Modify the checkProximity function to include pausing and message display
function checkProximity() {
    let marker = document.getElementById('moving-circle');
    let marker = document.getElementById('marker');
    let markerPos = { x: parseInt(marker.style.left, 10), y: parseInt(marker.style.top, 10) };
    let markerPos = { x: parseInt(marker.style.left, 10), y: parseInt(marker.style.top, 10) };
    let distance = calculateDistance(markerPos, markerPos);
    let proximityRadius = 20; // Radius
    if (distance <= proximityRadius) {
        celebrateSuccess();
    }
}

// Modify the celebrateSuccess function
function celebrateSuccess() {
    isListening = false; // Stop audio processing
    displayCelebratoryMessage();
    setTimeout(() => {
        let position = updateDisplay();
        initializePlot(xSpacing * position.x - xSpacing/2 - markerRadius, ySpacing * position.y - ySpacing/2 - markerRadius, initX, initY);
        isListening = true; // Restart audio processing
        processAudio();
    }, 1000); // Delay in ms
}
// Function to display a celebratory message
function displayCelebratoryMessage() {
    // Play a sound
    var audio = new Audio('assets/yay.mp3'); // Replace with the path to your sound file
    audio.play();

     // Create confetti container
     let confettiContainer = document.createElement('div');
     confettiContainer.id = 'confetti-container';
     document.body.appendChild(confettiContainer);
 
     // Generate confetti pieces
     for (let i = 0; i < 50; i++) {
         let confetti = document.createElement('div');
         confetti.className = 'confetti';
         confetti.style.left = `${Math.random() * 100}%`; // Randomize the initial horizontal position
         confetti.style.animationDelay = `${Math.random() * 2}s`; // Randomize the animation start time
         confetti.style.animationDuration = `${Math.random() * 3 + 2}s`; // Randomize the animation duration          confettiContainer.appendChild(confetti);
         confettiContainer.appendChild(confetti);
        }
 
     // Remove the confetti after 3 seconds
     setTimeout(() => {
         confettiContainer.remove();
     }, 3000);
}
*/

// Function to draw a grid
function drawGrid() {
    let plotArea = document.getElementById('plot-area');

    // Draw vertical lines
    for (let i = 0; i <= numberOfVerticalLines; i++) {
        let line = document.createElement('div');
        line.className = 'grid-line vertical';
        line.style.left = i * xSpacing + 'px';
        plotArea.appendChild(line);
    }

    // Draw horizontal lines
    for (let i = 0; i <= numberOfHorizontalLines; i++) {
        let line = document.createElement('div');
        line.className = 'grid-line horizontal';
        line.style.top = i * ySpacing + 'px';
        plotArea.appendChild(line);
    }
}

function addAxisLabels() {
    let plotArea = document.getElementById('plot-area');

    let yAxisLabelUpperLeft = document.createElement('div');
    yAxisLabelUpperLeft.className = 'axis-label';
    yAxisLabelUpperLeft.textContent = 'front/closed';
    yAxisLabelUpperLeft.style.top = '0';
    plotArea.appendChild(yAxisLabelUpperLeft);
    let yAxisLabelLowerLeft = document.createElement('div');
    yAxisLabelLowerLeft.className = 'axis-label';
    yAxisLabelLowerLeft.textContent = 'front/open';
    yAxisLabelLowerLeft.style.bottom = '0';
    plotArea.appendChild(yAxisLabelLowerLeft);
    let xAxisLabelUpperRight = document.createElement('div');
    xAxisLabelUpperRight.className = 'axis-label';
    xAxisLabelUpperRight.textContent = 'back/closed';
    xAxisLabelUpperRight.style.right = '0';
    plotArea.appendChild(xAxisLabelUpperRight);
    let xAxisLabelLowerRight = document.createElement('div');
    xAxisLabelLowerRight.className = 'axis-label';
    xAxisLabelLowerRight.textContent = 'back/open';
    xAxisLabelLowerRight.style.right = '0';
    xAxisLabelLowerRight.style.bottom = '0';
    plotArea.appendChild(xAxisLabelLowerRight);
}

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializePlot();
    updateDisplay(); // Initial display update
    document.getElementById('start-button-img').addEventListener('click', async () => {
        if (!isListening) {
            const recognizer = await createModel(); // Load and prepare the model
            init(recognizer); // Pass the loaded model to init for setting up real-time predictions
            isListening = true; // Update the listening state
            // Hide the start button
            let startButtonImg = document.getElementById('start-button-img');
            startButtonImg.style.visibility = 'hidden';
            startButtonImg.style.opacity = '0';
        }
    });
});
