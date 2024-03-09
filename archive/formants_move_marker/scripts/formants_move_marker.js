// move_marker_with_formants_demo.js
// Script that moves a marker in a F1 x F2 plot.

// Define global variables
let audioContext;
let analyser;
let microphone;
let isListening = false;
let currentWordIndex = -1;
let markerRadius = 15; // copied from style.css
let initX = -markerRadius;
let initY = -markerRadius;
let minX = -35;
let maxX = -60;
let minY = -5;
let maxY = -60;
let plotWidth = 800; // copied from style.css
let plotHeight = 100; // copied from style.css
let numberOfVerticalLines = 8; //32;
let numberOfHorizontalLines = 5; //7;
let imageSize = 400;

// Words
/*const words = [
    { word: "bat", format: "b<span class='highlighted'>a</span>t", position: { x: 600, y: 100 } },
    { word: "bot", format: "b<span class='highlighted'>o</span>t", position: { x: 600, y: 100 } },
    { word: "boot", format: "b<span class='highlighted'>oo</span>t", position: { x: 400, y: 0 } },
    { word: "book", format: "b<span class='highlighted'>oo</span>k", position: { x: 400, y: 100 } },
    { word: "beet", format: "b<span class='highlighted'>ee</span>t", position: { x: 350, y: 0 } }, 
    { word: "bit", format: "b<span class='highlighted'>i</span>t", position: { x: 350, y: 100 } }, 
    { word: "but", format: "b<span class='highlighted'>u</span>t", position: { x: 600, y: 100 } },
    { word: "bet", format: "b<span class='highlighted'>e</span>t", position: { x: 300, y: 100 } },
    { word: "bought", format: "b<span class='highlighted'>ough</span>t", position: { x: 450, y: 75 } } 
];*/
const words = [
    { word: "bot", format: "b<span class='highlighted'>o</span>t", position: { x: 750, y: 100 } },
    { word: "bat", format: "b<span class='highlighted'>a</span>t", position: { x: 600, y: 0 } }
];

// Function to initialize audio processing
async function initAudio() {
    //audioContext = new (window.AudioContext || window.AudioContext)();
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    sampleRate = audioContext.sampleRate;
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    microphone = audioContext.createMediaStreamSource(stream);
    analyser = audioContext.createAnalyser();
    microphone.connect(analyser);
    isListening = true;
    console.log(isListening);
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

        const features = extractFeatures(dataArray);
        console.log(features);
        updateMarkerPosition(features);
        //checkProximity();
    };
    process();
}

// Feature extraction
function extractFeatures(dataArray) {
    const formants = extractFormants(dataArray, sampleRate); // formants
    //console.log("F1: ", formants.F1.value)
    //console.log("F2: ", formants.F2.value)    
    const features = { x: formants.F1.value, y: formants.F2.value };
    //console.log(features.x, features.y);
    return features
}

// Function to initialize the plot with target and marker
function initializePlot(target_x, target_y, moving_x, moving_y) {
    let plotArea = document.getElementById('plot-area');

    // Clear existing elements in the plot area
    while (plotArea.firstChild) {
        plotArea.removeChild(plotArea.firstChild);
    }
    drawGrid();
    addAxisLabels();

    //let targetCircle = createCircle('target-circle', 'target circle', { x: target_x, y: target_y });
    let movingCircle = createCircle('moving-circle', 'moving circle', { x: moving_x, y: moving_y });

    //plotArea.appendChild(targetCircle);
    plotArea.appendChild(movingCircle);
}

// Function to create a circle
function createCircle(id, className, position) {
    let circle = document.createElement('div');
    circle.id = id;
    circle.className = className;
    if (position) {
        circle.style.left = position.x + 'px';
        circle.style.top = position.y + 'px';
    }
    return circle;
}

// Function to display the next word
function displayNextWord() {
    currentWordIndex = (currentWordIndex + 1) % words.length;
    //let currentWordIndex = Math.floor(Math.random() * words.length);
    let word = words[currentWordIndex].word;
    let formattedWord = words[currentWordIndex].format;
    //document.getElementById('word-display').innerHTML = formattedWord;
    
    /* / Update the image source
    let fixedImage = document.getElementById('word-image-fixed'); // Get the fixed image element
    let stretchableImage = document.getElementById('word-image-stretch'); // Get the stretchable image element
    fixedImage.style.display = 'block'; // Set the display property to make it visible
    stretchableImage.style.display = 'block'; // Set the display property to make it visible
    fixedImage.src = stretchableImage.src = 'assets/pictures/' + word + '.png'; // Set the source of the image

    // Ensure both images start with the same size
    fixedImage.style.width = stretchableImage.style.width = imageSize + 'px';
    //console.log('fixedImage.style.width', 'stretchableImage.style.width');
    fixedImage.style.height = stretchableImage.style.height = imageSize + 'px';
    */
    return words[currentWordIndex].position; // Return the position of the new word
}

// Function to update the marker position
function updateMarkerPosition(features) {
    // Normalize x and y values to fit within the plot area
    console.log("features.x: ", features.x)
    console.log("features.y: ", features.y)
    let normalizedX = normalizeValue(features.x, minX, maxX, 0, plotWidth);
    let normalizedY = normalizeValue(features.y, minY, maxY, 0, plotHeight);
    //console.log("normalizedX: ", normalizedX)
    //console.log("normalizedY: ", normalizedY)

    // Update marker position
    let marker = document.getElementById('moving-circle');
    marker.style.left = normalizedX + 'px';
    marker.style.top = normalizedY + 'px';

    /* / Get target position
    let target = document.getElementById('target-circle');
    let targetX = parseInt(target.style.left, 10);
    let targetY = parseInt(target.style.top, 10);

    // Update stretching image size based on marker position
    let stretchableImage = document.getElementById('word-image-stretch');
    stretchableImage.style.width = calculateImageWidth(normalizedX, targetX, imageSize, plotWidth) + 'px';
    stretchableImage.style.height = calculateImageHeight(normalizedY, targetY, imageSize, plotHeight) + 'px';
    */
}
function normalizeValue(value, minInput, maxInput, minOutput, maxOutput) {
    // Normalize a value from one range to another
    return ((value - minInput) / (maxInput - minInput)) * (maxOutput - minOutput) + minOutput;
}

function calculateImageWidth(markerX, targetX, plotWidth) {
    let deltaX = markerX - targetX;
    let initialWidth = imageSize;
    let stretchFactorX = Math.abs(deltaX) / (plotWidth / 2); // Factor by which to stretch

    // Expand or contract based on marker position relative to target
    return deltaX > 0 ? initialWidth * (1 + stretchFactorX) : initialWidth * (1 - stretchFactor);
}

function calculateImageHeight(markerY, targetY, plotHeight) {
    let deltaY = markerY - targetY;
    let initialHeight = imageSize;
    let stretchFactorY = Math.abs(deltaY) / (plotHeight / 2); // Factor by which to stretch

    // Expand or contract based on marker position relative to target
    return deltaY > 0 ? initialHeight * (1 + stretchFactorY) : initialHeight * (1 - stretchFactor);
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
        let position = displayNextWord();
        initializePlot(position.x - markerRadius, position.y - markerRadius, initX, initY);
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

// Function to draw a grid
function drawGrid() {
    let plotArea = document.getElementById('plot-area');
    let xSpacing = plotWidth / numberOfVerticalLines;
    let ySpacing = plotHeight / numberOfHorizontalLines;

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
    let position = displayNextWord();
    initializePlot(position.x - markerRadius, position.y - markerRadius, initX, initY);
    document.getElementById('start-button-img').addEventListener('click', () => {
        if (!isListening) {
            initAudio();
            let startButtonImg = document.getElementById('start-button-img');
            startButtonImg.style.visibility = 'hidden';
            startButtonImg.style.opacity = '0';
        }
    });
});
