// script.js
/* Script that uses tensorflow model to provide real-time feedback about pronunciation.
   Feedback is in the form of modified plot markers and stretched images.
*/

// Define global variables
let audioContext;
let analyser;
let microphone;
let isListening = false;
let currentWordIndex = -1;
let markerRadius = 15; // copied from style.css
let plotWidth = 800; // copied from style.css
let plotHeight = 100; // copied from style.css
let numberOfVerticalLines = 15;
let numberOfHorizontalLines = 7;
let xSpacing = plotWidth / numberOfVerticalLines;
let ySpacing = plotHeight / numberOfHorizontalLines;
let imageSize = 400;
const modelURL = "https://teachablemachine.withgoogle.com/models/g26KsVfaq/"; // Teachable Machine tensorflow model

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
    const recognizer = await createModel();
    const classLabels = recognizer.wordLabels(); // get class labels
    const labelContainer = document.getElementById("label-container");
    for (let i = 0; i < classLabels.length; i++) {
        labelContainer.appendChild(document.createElement("div"));
    }

    // listen() takes two arguments:
    // 1. A callback function that is invoked anytime a word is recognized.
    // 2. A configuration object with adjustable fields
    recognizer.listen(result => {
        const scores = result.scores; // probability of prediction for each class
        // render the probability scores per class
        for (let i = 0; i < classLabels.length; i++) {
            const classPrediction = classLabels[i] + ": " + result.scores[i].toFixed(2);
            labelContainer.childNodes[i].innerHTML = classPrediction;
        }
    }, {
        includeSpectrogram: true, // in case listen should return result.spectrogram
        probabilityThreshold: 0.75,
        invokeCallbackOnNoiseAndUnknown: true,
        overlapFactor: 0.50 // probably want between 0.5 and 0.75. More info in README
    });
}

/*
// Function to initialize audio processing
async function initAudio() {
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    sampleRate = audioContext.sampleRate;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    microphone = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    microphone.connect(analyser);
    isListening = true;
    processAudio();
}

// Function to process audio data
function processAudio() {
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Float32Array(bufferLength);
    //const dataArray = new Uint8Array(analyser.frequencyBinCount);
    const process = () => {
        if (!isListening) return; // Stop processing if not listening
        requestAnimationFrame(process);
        analyser.getFloatFrequencyData(dataArray);

        //const features = extractFeatures(dataArray);
        //updateMarkerPosition(features);
        //checkProximity();
    };
    process();
}
*/

// Function to initialize the plot with target and marker
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
    let currentVowel = words[currentWordIndex].vowel;
    let currentFormattedWord = words[currentWordIndex].format;
    let defaultTargetColor = '#d3d3d3';
    let currentTargetColor = '#ea234b';
    document.getElementById('word-display').innerHTML = currentFormattedWord;

    // Create target circles for all of the vowels
    vowels.forEach(vowel => {
        // Use the position from the vowels array to position the circle
        let targetPosition = { x: xSpacing * vowel.position.x + xSpacing/2 - markerRadius/2, y: ySpacing * vowel.position.y + ySpacing/2 - markerRadius/2 };
        if (vowel.vowel == currentVowel) {
            createTargetCircle(vowel.vowel, targetPosition, currentTargetColor);            
        } else {
            createTargetCircle(vowel.vowel, targetPosition, defaultTargetColor);            
        }
    });

    //let movingCircle = createCircle('moving-circle', 'moving circle', { x: initX, y: initY });
    //plotArea.appendChild(movingCircle);

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

// Function to create target circle
function createTargetCircle(vowel, position, color) {
    let circle = document.createElement('div');
    circle.id = 'target-' + vowel; // Ensure unique ID
    circle.className = 'target-circle';
    circle.style.backgroundColor = color;
    circle.style.left = position.x + 'px';
    circle.style.top = position.y + 'px';
    document.getElementById('plot-area').appendChild(circle);
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

    // Get target position
    let target = document.getElementById('target-circle');
    let targetX = parseInt(target.style.left, 10);
    let targetY = parseInt(target.style.top, 10);

    // Update stretching image size based on marker position
    let stretchableImage = document.getElementById('word-image-stretch');
    stretchableImage.style.width = calculateImageWidth(normalizedX, targetX, imageSize, plotWidth) + 'px';
    stretchableImage.style.height = calculateImageHeight(normalizedY, targetY, imageSize, plotHeight) + 'px';
}
function normalizeValue(value, minInput, maxInput, minOutput, maxOutput) {
    // Normalize a value from one range to another
    return ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;
}

function calculateImageWidth(markerX, targetX, plotWidth) {
    let deltaX = markerX - targetX;
    let initialWidth = imageSize;
    let stretchFactorX = Math.abs(deltaX) / (plotWidth / 2); // Factor by which to stretch
    console.log(stretchFactorX);

    // Expand or contract based on marker position relative to target
    return deltaX > 0 ? initialWidth * (1 + stretchFactorX) : initialWidth * (1 - stretchFactorX);
}

function calculateImageHeight(markerY, targetY, plotHeight) {
    let deltaY = markerY - targetY;
    let initialHeight = imageSize;
    let stretchFactorY = Math.abs(deltaY) / (plotHeight / 2); // Factor by which to stretch

    // Expand or contract based on marker position relative to target
    return deltaY > 0 ? initialHeight * (1 + stretchFactorY) : initialHeight * (1 - stretchFactorY);
}

// Define a function to calculate the distance between two points
function calculateDistance(pos1, pos2) {
    return Math.sqrt(Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2));
}
// Modify the checkProximity function to include pausing and message display
function checkProximity() {
    let marker = document.getElementById('moving-circle');
    let target = document.getElementById('target-circle');
    let markerPos = { x: parseInt(marker.style.left, 10), y: parseInt(marker.style.top, 10) };
    let targetPos = { x: parseInt(target.style.left, 10), y: parseInt(target.style.top, 10) };
    let distance = calculateDistance(markerPos, targetPos);
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
    let position = updateDisplay();
    document.getElementById('start-button-img').addEventListener('click', () => {
        /*
        if (!isListening) {
            initAudio();
            let startButtonImg = document.getElementById('start-button-img');
            startButtonImg.style.visibility = 'hidden';
            startButtonImg.style.opacity = '0';
        }*/
    });
});
