var lobby_id
var hangWord;
var maxAttempts = 6;
var attempts = 0;
var guessedLetters = [];
var correctGuesses = [];


function initializeHangmanGame() {
    tremola = JSON.parse(window.localStorage.getItem('tremola'));
    backend('ready');
    lobby_id =  localStorage.getItem('currentGameLobby');
    gameRunning = true;
    console.log("hangman lobby id", lobby_id);
    console.log("hangman state of json", JSON.stringify(tremola));
    hangWord = tremola.hangman[lobby_id].hangmanWord;
    attempts = 0;
    guessedLetters = [];
    correctGuesses = Array(hangWord.length).fill("_");
    document.getElementById("wordDisplay").textContent = correctGuesses.join(" ");
    document.getElementById("hangmanImage").src = `images/hangman0.png`;
    document.getElementById("remainingAttempts").textContent = `Remaining Attempts: ${maxAttempts}`;
    document.getElementById("attemptedLetters").textContent = `Attempted Letters: `;
    document.getElementById("message").textContent = "";
    document.getElementById("guessInput").disabled = false;
    document.querySelector("button[onclick='makeLetterGuess()']").disabled = false;
    document.getElementById("wordGuessInput").disabled = false;
    document.querySelector("button[onclick='makeWordGuess()']").disabled = false;
    apply_all_operationsHangman(lobby_id)
};


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
    var hangmanLobby = tremola.hangman[lobby_id]
    if (hangmanLobby.guessedLetters.includes(guess)) {
        document.getElementById("message").textContent = "That letter is already guessed.";
        return;
    }
    //send message to backend with guess
    guessHGMLetter(guess,lobby_id);
    document.getElementById("message").textContent = "";
    input.value = "";
}

function makeWordGuess() {
    const input = document.getElementById("wordGuessInput");
    const guess = input.value.toLowerCase();

    if (guess.length !== hangWord.length) {
        document.getElementById("message").textContent = "Please enter a valid word.";
        return;
    }
    //send message to backend with guess
    guessHGMWord(guess,lobby_id);
    document.getElementById("message").textContent = "";

    input.value = "";
}

function disableInput() {
    document.getElementById("guessInput").disabled = true;
    document.querySelector("button[onclick='makeLetterGuess()']").disabled = true;
    document.getElementById("wordGuessInput").disabled = true;
    document.querySelector("button[onclick='makeWordGuess()']").disabled = true;
}


function receiveLetterGuess(userName,guess){
    if (hangWord.includes(guess)) {
        for (let i = 0; i < hangWord.length; i++) {
            if (hangWord[i] === guess) {
                correctGuesses[i] = guess;
            }
        }
    } else {
        guessedLetters.push(guess);
        updateAttemptedLetters();
        attempts++;
        updateHangmanImage();
    }
    document.getElementById("wordDisplay").textContent = correctGuesses.join(" ");
    document.getElementById("remainingAttempts").textContent = `Remaining Attempts: ${maxAttempts - attempts}`;

    if (correctGuesses.join("") === hangWord) {
        document.getElementById("message").textContent = "Congratulations! " + userName+ " won!";
        disableInput();
    } else if (attempts >= maxAttempts) {
        document.getElementById("message").textContent = `Game Over! The word was "${hangWord}".`;
        disableInput();
    }
}
function receiveWordGuess(userName,guess){
    if (guess === hangWord) {
        document.getElementById("wordDisplay").textContent = hangWord.split("").join(" ");
        document.getElementById("message").textContent = "Congratulations! " +userName + " won!";
        disableInput();
    } else {
        attempts++;
        updateHangmanImage();
        document.getElementById("remainingAttempts").textContent = `Remaining Attempts: ${maxAttempts - attempts}`;
        updateAttemptedLetters();
        document.getElementById("message").textContent = `Incorrect guess. Try again.`;
    }

    if (attempts >= maxAttempts) {
        document.getElementById("message").textContent = `Game Over! The word was "${hangWord}".`;
        disableInput();
    }
 }



