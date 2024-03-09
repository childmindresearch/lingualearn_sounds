# tensorflow_stretch_image (8 March 2024)

This demo shows how a vowel estimation audio model can be used 
to detect when a vowel is mispronounced, resulting real-time visual feedback.

A word is displayed with a highlighted target vowel to be spoken aloud.

Visual feedback in this consists of: 
  (1) a picture that changes shape
  (2) a heatmap that changes color saturation
according to how closely one's pronunciation matches the target vowel sound.

The heatmap represents the International Phonetic Alphabet vowel chart, 
with each vowel's cell color-saturated based on a pronunciation score.
The score is computed by a Google Teachable Machine deep learning model 
trained to guess which vowel is pronounced.

The distance between spoken vs. target vowel sound along x and along y
determine how much an image (corresponding to the displayed word)
is stretched along x and along y. 



