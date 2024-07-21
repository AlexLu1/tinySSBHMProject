let words = [];
let word;
const maxAttempts = 6;
let attempts = 0;
let guessedLetters = [];
let correctGuesses = [];

document.addEventListener("DOMContentLoaded", () => {
    fetch('words.json')
        .then(response => response.json())
        .then(data => {
            words = data.words;
            startGame();
        })
        .catch(error => console.error('Error loading word list:', error));
});

function startGame() {
    word = words[Math.floor(Math.random() * words.length)];
    attempts = 0;
    guessedLetters = [];
    correctGuesses = Array(word.length).fill("_");
    document.getElementById("wordDisplay").textContent = correctGuesses.join(" ");
    document.getElementById("hangmanImage").src = `images/hangman0.png`;
    document.getElementById("remainingAttempts").textContent = `Remaining Attempts: ${maxAttempts}`;
    document.getElementById("attemptedLetters").textContent = `Attempted Letters: `;
    document.getElementById("message").textContent = "";
    document.getElementById("guessInput").disabled = false;
    document.querySelector("button[onclick='makeLetterGuess()']").disabled = false;
    document.getElementById("wordGuessInput").disabled = false;
    document.querySelector("button[onclick='makeWordGuess()']").disabled = false;
}

function updateHangmanImage() {
    document.getElementById("hangmanImage").src = `images/hangman${attempts}.png`;
}

function updateAttemptedLetters() {
    document.getElementById("attemptedLetters").textContent = `Attempted Letters: ${guessedLetters.join(", ")}`;
}

function makeLetterGuess() {
    const input = document.getElementById("guessInput");
    const guess = input.value.toLowerCase();

    if (guess.length !== 1 || !guess.match(/[a-z]/i)) {
        document.getElementById("message").textContent = "Please enter a single letter.";
        return;
    }

    if (guessedLetters.includes(guess)) {
        document.getElementById("message").textContent = "You already guessed that letter.";
        return;
    }

    guessedLetters.push(guess);
    document.getElementById("message").textContent = "";

    if (word.includes(guess)) {
        for (let i = 0; i < word.length; i++) {
            if (word[i] === guess) {
                correctGuesses[i] = guess;
            }
        }
    } else {
        attempts++;
        updateHangmanImage();
    }

    document.getElementById("wordDisplay").textContent = correctGuesses.join(" ");
    document.getElementById("remainingAttempts").textContent = `Remaining Attempts: ${maxAttempts - attempts}`;
    updateAttemptedLetters();

    if (correctGuesses.join("") === word) {
        document.getElementById("message").textContent = "Congratulations! You won!";
        disableInput();
    } else if (attempts >= maxAttempts) {
        document.getElementById("message").textContent = `Game Over! The word was "${word}".`;
        disableInput();
    }

    input.value = "";
}

function makeWordGuess() {
    const input = document.getElementById("wordGuessInput");
    const guess = input.value.toLowerCase();

    if (guess.length !== word.length || !guess.match(/^[a-z]+$/i)) {
        document.getElementById("message").textContent = "Please enter a valid word.";
        return;
    }

    guessedLetters.push(guess);
    document.getElementById("message").textContent = "";

    if (guess === word) {
        document.getElementById("wordDisplay").textContent = word.split("").join(" ");
        document.getElementById("message").textContent = "Congratulations! You won!";
        disableInput();
    } else {
        attempts++;
        updateHangmanImage();
        document.getElementById("remainingAttempts").textContent = `Remaining Attempts: ${maxAttempts - attempts}`;
        updateAttemptedLetters();
        document.getElementById("message").textContent = `Incorrect guess. Try again.`;
    }

    if (attempts >= maxAttempts) {
        document.getElementById("message").textContent = `Game Over! The word was "${word}".`;
        disableInput();
    }

    input.value = "";
}

function disableInput() {
    document.getElementById("guessInput").disabled = true;
    document.querySelector("button[onclick='makeLetterGuess()']").disabled = true;
    document.getElementById("wordGuessInput").disabled = true;
    document.querySelector("button[onclick='makeWordGuess()']").disabled = true;
}


