// script.js
/* Script that uses tensorflow model to provide real-time feedback about pronunciation.
   Feedback is in the form of modified plot markers and stretched images.
*/

// Define global variables in css file
const numHorizontalCells = 8;
const numVerticalCells = 5;
const imageSize = 300;

// Define other global variables
const imageHorizontalScaleFactor = 0.2;
const imageVerticalScaleFactor = 0.1;

const redColorHex = "#ea234b"; //"#a31c3f";
const defaultFillColorHex = "#ffffff";
const defaultBorderColorHex = "#d3d3d3";
const redColorRGB = [234, 35, 75]; //[155, 34, 66];
const defaultFillColorRGB = [255, 255, 255];
const defaultBorderColorRGB = [211, 211, 211];

const modelURL = "https://teachablemachine.withgoogle.com/models/qvN9cgbf5/"; // Teachable Machine tensorflow arno-9vowel-audio-model.tm
const sampleRate = 44100;

const successThreshold = 0.75; // Define a suitable threshold for success
const probabilityThreshold = 0.75;
const overlapFactor = 0.5;

const timeToCelebrate = 2000;
let isListening = false;
let currentWordIndex = -1;

// Words
const words = [
    { word: "beetle", format: "b<span class='highlighted'>ee</span>tle", vowel: "IY" }, 
    { word: "betta", format: "b<span class='highlighted'>e</span>tta", vowel: "EH" },
    { word: "butterfly", format: "b<span class='highlighted'>u</span>tterfly", vowel: "AH" },
    { word: "bot", format: "b<span class='highlighted'>o</span>t", vowel: "AA" },
    { word: "boot", format: "b<span class='highlighted'>oo</span>t", vowel: "UW" },
    { word: "bat", format: "b<span class='highlighted'>a</span>t", vowel: "AE" },
    { word: "book", format: "b<span class='highlighted'>oo</span>k", vowel: "UH" },
    { word: "bitten", format: "b<span class='highlighted'>i</span>tten", vowel: "IH" }, 
    { word: "bought", format: "b<span class='highlighted'>ough</span>t", vowel: "AO" } 
];

// Vowels and their (zero-index) positions in the IPA chart
const vowels = [
    { vowel: "IY", position: { x: 0, y: 0 } }, 
    { vowel: "EH", position: { x: 2, y: 2 } },
    { vowel: "AH", position: { x: 6, y: 2 } },
    { vowel: "AA", position: { x: 4, y: 4 } },
    { vowel: "UW", position: { x: 7, y: 0 } },
    { vowel: "AE", position: { x: 3, y: 3 } },
    { vowel: "UH", position: { x: 5, y: 1 } },
    { vowel: "IH", position: { x: 1, y: 1 } }, 
    { vowel: "AO", position: { x: 7, y: 2 } } 
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
        // 1. A callback function that is invoked anytime a word is recognized
        // 2. A configuration object with adjustable fields
        recognizer.listen(result => {
            // Iterate over vowels to update each marker's color based on the score
            const scoresWithBackgroundNoise = result.scores;

            // Model class labels array
            const labelsWithBackgroundNoise = recognizer.wordLabels();
            // Find the index of "Background noise" in the labels array
            const backgroundNoiseIndex = labelsWithBackgroundNoise.indexOf("Background Noise");
            // Extract the "Background noise" score using the found index
            const backgroundNoiseScore = scoresWithBackgroundNoise[backgroundNoiseIndex];
            // Extract scores without "Background noise"
            const scores = scoresWithBackgroundNoise.filter((_, index) => index !== backgroundNoiseIndex);
            const labels = labelsWithBackgroundNoise.filter((_, index) => index !== backgroundNoiseIndex);
            //console.log(scores, labels, vowels);

            // Update grid cell colors according to scores
            vowels.forEach(vowel => {
                // Use the position from the vowels array to color the grid cells
                let index = labels.indexOf(vowel.vowel);
                let score = scores[index];
                updateCellColor(vowel.position.x, vowel.position.y, scoreToColor(score), vowel.vowel === words[currentWordIndex].vowel ? redColorHex : defaultBorderColorHex);
            });

            // Find the maximum scoring vowel's position
            const highestScore = Math.max(...scores);
            if (highestScore > backgroundNoiseScore) {
                const highestScoreIndex = scores.findIndex(score => score === highestScore);
                const highestScoreLabel = labels[highestScoreIndex];
                const highestScoreVowel = vowels.find(v => v.vowel === highestScoreLabel);
                const highestScorePosition = highestScoreVowel.position;
    
                const currentPosition = vowels[currentWordIndex].position;
                adjustImageScale('image-stretch', currentPosition, highestScorePosition);

                // If the highest score matches the current word's vowel and is above a threshold, celebrate success
                const currentVowel = words[currentWordIndex].vowel;
                const currentVowelIndex = labels.indexOf(currentVowel);
                const currentVowelScore = scores[currentVowelIndex];
                const isHighestScore = currentVowelScore === highestScore;
                const successConditionMet = currentVowelScore > successThreshold && isHighestScore;
                handleResult(successConditionMet, currentVowel); // Process the result to handle specific logic
            }
        }, {
            includeSpectrogram: false, // in case listen should return result.spectrogram
            probabilityThreshold: probabilityThreshold,
            invokeCallbackOnNoiseAndUnknown: true,
            overlapFactor: overlapFactor
        });
    });
    //const classLabels = recognizer.wordLabels(); // get class labels
}

// Function to adjust the scale of the image based on proximity to score
function adjustImageScale(imageId, currentPosition, highestScorePosition) {

    const stretchImage = document.getElementById(imageId);

    /* Scale the image horizontally based on the difference in position.x 
       between the current vowel and the highest-scoring vowel.
       Scale the image vertically based on the difference in position.y 
       between the current vowel and the highest-scoring vowel.
       The maximum possible difference in position is 7 horizontally and 4 vertically. 
    */
    let horizontalScaleFactor = 1 + imageHorizontalScaleFactor * (currentPosition.x - highestScorePosition.x) / 7;
    let verticalScaleFactor = 1 + imageVerticalScaleFactor * (currentPosition.y - highestScorePosition.y) / 4;

    // Apply the scale to the stretch image
    stretchImage.style.transform = `scale(${horizontalScaleFactor}, ${verticalScaleFactor})`;

    // Adjust the position to keep the bottom aligned with the fixed image
    stretchImage.style.transformOrigin = 'bottom';
}

// Function to extend celebration if condition successfully met
async function handleResult(successConditionMet, currentVowel) {
    // Logic to determine if the success condition is met
    if (successConditionMet) {
        // Find the vowel's position in the grid
        const vowelInfo = vowels.find(vowel => vowel.vowel === currentVowel);
        if (vowelInfo) {
            // Update the grid cell's color based on the vowel position
            updateCellColor(vowelInfo.position.x, vowelInfo.position.y, redColorHex, redColorHex);
        }
        // Additional logic for celebration and display updates
        await celebrateAndDisplayMessage(); // Assuming this function handles celebration visuals or messages
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

// Combined function for celebrating success with audio and visual feedback
async function celebrateAndDisplayMessage() {
    // Play a sound
    // var audio = new Audio('assets/yay.mp3'); // Replace with the path to your sound file
    // audio.play();

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
 
    // Wait for the confetti to display before clearing
    await new Promise(resolve => setTimeout(resolve, timeToCelebrate)); // Adjust timeout to match the duration of the confetti animation
    confettiContainer.remove();

    // Updata display (image, word, grid colors)
    updateDisplay();

}

// Function to initialize the plot
function initializePlot() {
    const gridArea = document.getElementById('grid-area');
    createGrid();  //updateCellColor(1, 1, 'gray', 'red');
}

// Function to create a grid of independently addressable cells
function createGrid() {
    const gridArea = document.getElementById('grid-area');
    let count = 0;
    for (let i = 0; i < 5; i++) { // 5 rows
      for (let j = 0; j < 8; j++) { // 8 columns
        const cell = document.createElement('div');
        cell.className = 'grid-cell';
        cell.dataset.x = j;
        cell.dataset.y = i;
        gridArea.appendChild(cell);
        count++;
      }
    }
}

// Function to update the background and outline colors of the grid cells
function updateCellColor(x, y, backgroundColor, borderColor) {
    const cells = document.querySelectorAll(`.grid-cell[data-x="${x}"][data-y="${y}"]`);
    if (cells.length) {
      cells.forEach(cell => {
        cell.style.backgroundColor = backgroundColor;
        cell.style.border = `2px solid ${borderColor}`;
      });
    }
}

// Preload images
function preloadImagesAndDisplay(images, callback) {
    let loadedCount = 0;
    images.forEach(imgObj => {
        const img = new Image();
        img.onload = () => {
            loadedCount++;
            if (loadedCount === images.length) {
                callback(); // All images are loaded
            }
        };
        img.src = imgObj.src;
    });
}

// Function to update the display with the next word, markers, picture, etc.
function updateDisplay() {
    //currentWordIndex = Math.floor(Math.random() * words.length);
    currentWordIndex = (currentWordIndex + 1) % words.length;
    let currentWord = words[currentWordIndex].word;
    let currentFormattedWord = words[currentWordIndex].format;
    document.getElementById('word-display').innerHTML = currentFormattedWord;

    // Update cell background and outline colors for all of the vowels
    vowels.forEach(vowel => {
        updateCellColor(vowel.position.x, vowel.position.y, defaultFillColorHex, vowel.vowel === words[currentWordIndex].vowel ? redColorHex : defaultBorderColorHex);
    });

    // Capture the current state for the images to preload
    let fixedImageElement = document.getElementById('image-fixed');
    let stretchableImageElement = document.getElementById('image-stretch');
    let fixedImageSrc = 'assets/pictures/' + currentWord + '-red.png' + '?v=' + new Date().getTime();
    let stretchableImageSrc = 'assets/pictures/' + currentWord + '-black.png' + '?v=' + new Date().getTime();

    // Prepare images for preloading with the captured state
    let imagesToPreload = [
        {element: fixedImageElement, src: fixedImageSrc},
        {element: stretchableImageElement, src: stretchableImageSrc}
    ];

    // Initially hide images to prevent flash
    imagesToPreload.forEach(img => {
        img.element.style.visibility = 'hidden';
    });

    // Preload images and update their sources once loaded, using the captured sources
    preloadImagesAndDisplay(imagesToPreload, () => {
        // Make images visible and update their sources once they are loaded
        imagesToPreload.forEach(img => {
            img.element.src = img.src; // Use the captured src, not the potentially updated currentWordIndex
            img.element.style.visibility = 'visible';
            img.element.style.width = imageSize + 'px';
            img.element.style.height = imageSize + 'px';
        }); 
    });
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
