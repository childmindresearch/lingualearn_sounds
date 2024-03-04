// script.js
/* Script that uses tensorflow model to provide real-time feedback about pronunciation.
   Feedback is in the form of modified plot markers and stretched images.
*/

// Define global variables
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
let timeToCelebrate = 2000;
let redColorHex = "#ea234b"; //"#a31c3f";
let defaultFillColorHex = "#ffffff";
let defaultBorderColorHex = "#d3d3d3";
let redColorRGB = [234, 35, 75]; //[155, 34, 66];
let defaultFillColorRGB = [255, 255, 255];
let defaultBorderColorRGB = [211, 211, 211];
const modelURL = "https://teachablemachine.withgoogle.com/models/g26KsVfaq/"; // Teachable Machine tensorflow model
const sampleRate = 44100;

// Words
const words = [
    { word: "bot", format: "b<span class='highlighted'>o</span>t", vowel: "AA" },
    { word: "bat", format: "b<span class='highlighted'>a</span>t", vowel: "AE" },
    { word: "beet", format: "b<span class='highlighted'>ee</span>t", vowel: "IY" }, 
    { word: "bit", format: "b<span class='highlighted'>i</span>t", vowel: "IH" }, 
    { word: "bet", format: "b<span class='highlighted'>e</span>t", vowel: "EH" },
    { word: "but", format: "b<span class='highlighted'>u</span>t", vowel: "AH" },
    { word: "book", format: "b<span class='highlighted'>oo</span>k", vowel: "UH" },
    { word: "boot", format: "b<span class='highlighted'>oo</span>t", vowel: "UW" },
    { word: "bought", format: "b<span class='highlighted'>ough</span>t", vowel: "AO" } 
];

// Vowels and their (zero-index) positions in the IPA chart
const vowels = [
    { vowel: "AA", position: { x: 6, y: 6 } },
    { vowel: "AE", position: { x: 5, y: 5 } },
    { vowel: "IY", position: { x: 0, y: 0 } }, 
    { vowel: "IH", position: { x: 3, y: 1 } }, 
    { vowel: "EH", position: { x: 4, y: 4 } },
    { vowel: "AH", position: { x: 12, y: 4 } },
    { vowel: "UH", position: { x: 11, y: 1 } },
    { vowel: "UW", position: { x: 14, y: 0 } },
    { vowel: "AO", position: { x: 14, y: 4 } } 
];

// Function to create a tensorflow model
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

// Function to initialize audio capture
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

            // Iterate over vowels to update each marker's color based on the score
            vowels.forEach(vowel => {
                const marker = document.getElementById('marker-' + vowel.vowel);
                if (marker) {
                    const index = recognizer.wordLabels().indexOf(vowel.vowel);
                    const score = result.scores[index];
                    marker.style.backgroundColor = scoreToColor(score); // Update color based on score
                }
            });

            // If the highest score matches the current word's vowel, celebrate success
            currentVowel = words[currentWordIndex].vowel;
            const currentVowelIndex = recognizer.wordLabels().indexOf(currentVowel);
            const currentVowelScore = result.scores[currentVowelIndex];
            const successThreshold = 0.50; // Define a suitable threshold for success
            const isHighestScore = currentVowelScore === Math.max(...result.scores);
            const successConditionMet = currentVowelScore > successThreshold && isHighestScore;

            adjustImageScale(currentVowelScore, 'image-stretch');

            handleResult(successConditionMet, currentVowel); // Process the result to handle specific logic
        }, {
            includeSpectrogram: true, // in case listen should return result.spectrogram
            probabilityThreshold: 0.75,
            invokeCallbackOnNoiseAndUnknown: true,
            overlapFactor: 0.50
        });
    });
    const classLabels = recognizer.wordLabels(); // get class labels
}

// Function to extend celebration if condition successfully met
async function handleResult(successConditionMet, currentVowel) {
    // Logic to determine if the success condition is met
    if (successConditionMet) {
        const currentVowelMarker = document.getElementById('marker-' + currentVowel);
        
        // Temporarily set both border and fill to red
        currentVowelMarker.style.backgroundColor = redColorHex;
        currentVowelMarker.style.borderColor = redColorHex;

        await celebrateAndDisplayMessage(currentVowelMarker); // Wait for celebration and message to complete

        updateDisplay(); // Update the display for the next word
    }
}

// Function to normalize and adjust score
// This function uses Math.pow(percent, 0.5) to apply a square root 
// to the normalized score, which amplifies the impact of lower scores. 
function adjustScore(score) {
    // Ensure score is between 0 and 1
    //const percent = Math.max(0, Math.min(1, score)); // Ensure percent is between 0 and 1
 
    // Use an exponential function to amplify small scores
    const adjustedScore = Math.pow(score, 0.5); // Adjust the exponent as needed

    // Use a logistic function 
    // This function is typically used in logistic regression and neural networks 
    // for activation functions. The general form here is tweaked to adjust its output 
    // towards 1 based on the input value.
    //const adjustedScore = 1 - (1 / (1 + Math.exp(-10 * (score - 0.5))));

    return adjustedScore;
}

// Function to map a score to a color
// Interpolate between light gray for low score and red for high score.
function scoreToColor(score) {
    
    let adjustedScore = adjustScore(score);

    // Linear interpolation between defaultFillColorRGB and redColorRGB
    const r = Math.floor((redColorRGB[0] - defaultFillColorRGB[0]) * adjustedScore + defaultFillColorRGB[0]);
    const g = Math.floor((redColorRGB[1] - defaultFillColorRGB[1]) * adjustedScore + defaultFillColorRGB[1]);
    const b = Math.floor((redColorRGB[2] - defaultFillColorRGB[2]) * adjustedScore + defaultFillColorRGB[2]);

    return `rgb(${r},${g},${b})`;
}

// Function to initialize the plot
function initializePlot() {
    let plotArea = document.getElementById('plot-area');
    plotArea.innerHTML = ''; // Clear existing elements in the plot area
    drawGrid();
    //addAxisLabels();
}

// Function to update the display with the next word, markers, picture, etc.
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
        createMarker(vowel.vowel, markerPosition, defaultFillColorHex, vowel.vowel === words[currentWordIndex].vowel ? redColorHex : defaultBorderColorHex);
    });

    // Update the image source
    let fixedImage = document.getElementById('image-fixed'); // Get the fixed image element
    let stretchableImage = document.getElementById('image-stretch'); // Get the stretchable image element
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

// Function to adjust the scale of the image based on proximity to score
function adjustImageScale(score, imageId) {
    const image = document.getElementById(imageId);

    let adjustedScore = adjustScore(score);
    console.log('score: ', score);
    console.log('adjustedScore: ', adjustedScore);
    const scaleFactor = adjustedScore; // Adjust based on score
    image.style.transform = `scale(${scaleFactor}, ${scaleFactor})`;
}

// Combined function for celebrating success with audio and visual feedback
async function celebrateAndDisplayMessage(currentVowelMarker) {
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
 
    // Wait for the audio to finish and confetti to display before clearing
    await new Promise(resolve => audio.onended = resolve);
    setTimeout(() => {
         confettiContainer.remove();
    }, timeToCelebrate); // Adjust timeout to match the duration of the confetti animation
}

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
