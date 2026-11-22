
// COLLEGEHUB - WRITING PATTERN ANALYSER

const detectorText = document.getElementById("detectorText");
const characterCount = document.getElementById("characterCount");
const analyseButton = document.getElementById("analyseButton");

const resultsSection = document.getElementById("resultsSection");
const aiScore = document.getElementById("aiScore");
const aiVerdict = document.getElementById("aiVerdict");
const sentenceResults = document.getElementById("sentenceResults");

// CHARACTER COUNTER
detectorText.addEventListener("input", () => {
    characterCount.textContent =
        `${detectorText.value.length} characters`;
});

// SPLIT TEXT INTO SENTENCES
function getSentences(text) {
    return text
        .match(/[^.!?]+[.!?]+|[^.!?]+$/g)
        ?.map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0) || [];
}

// ANALYSE WRITING PATTERNS
function analyseWriting(text) {

    const sentences = getSentences(text);

    const words = text
        .toLowerCase()
        .match(/\b[a-z']+\b/g) || [];

    if (sentences.length < 3 || words.length < 30) {
        throw new Error("Please enter more text for a useful pattern analysis.");
    }

    // 1. SENTENCE LENGTH CONSISTENCY
    const sentenceLengths = sentences.map(sentence =>
        sentence.split(/\s+/).length
    );

    const averageLength =
        sentenceLengths.reduce((a, b) => a + b, 0) /
        sentenceLengths.length;

    const variance =
        sentenceLengths.reduce(
            (total, length) =>
                total + Math.pow(length - averageLength, 2),
            0
        ) / sentenceLengths.length;

    const standardDeviation = Math.sqrt(variance);

    const consistencyScore = Math.max(
        0,
        100 - standardDeviation * 8
    );

    // 2. VOCABULARY REPETITION
    const wordCounts = {};

    words.forEach(word => {
        if (word.length > 3) {
            wordCounts[word] = (wordCounts[word] || 0) + 1;
        }
    });

    const repeatedWords = Object.values(wordCounts)
        .filter(count => count > 2).length;

    const repetitionScore = Math.min(
        100,
        (repeatedWords / Math.max(words.length / 20, 1)) * 100
    );

    // 3. REPEATED SENTENCE STARTERS
    const starters = sentences.map(sentence =>
        sentence
            .toLowerCase()
            .split(/\s+/)
            .slice(0, 2)
            .join(" ")
            .replace(/[^a-z\s]/g, "")
    );

    const starterCounts = {};

    starters.forEach(starter => {
        starterCounts[starter] =
            (starterCounts[starter] || 0) + 1;
    });

    const repeatedStarters = Object.values(starterCounts)
        .filter(count => count > 1)
        .reduce((total, count) => total + count - 1, 0);

    const starterScore = Math.min(
        100,
        (repeatedStarters / sentences.length) * 100
    );

    // 4. OVERALL WRITING PATTERN INDICATOR
    const patternScore = Math.round(
        (consistencyScore * 0.4) +
        (repetitionScore * 0.3) +
        (starterScore * 0.3)
    );

    return {
        patternScore,
        averageLength: averageLength.toFixed(1),
        consistencyScore: Math.round(consistencyScore),
        repetitionScore: Math.round(repetitionScore),
        starterScore: Math.round(starterScore),
        sentenceCount: sentences.length,
        wordCount: words.length
    };
}

// DISPLAY RESULTS
function displayResults(results) {

    aiScore.textContent = `${results.patternScore}/100`;

    aiVerdict.textContent =
        results.patternScore >= 70
            ? "Many of the measured writing patterns are present."
            : results.patternScore >= 40
                ? "Some of the measured writing patterns are present."
                : "Few of the measured writing patterns are present.";

    sentenceResults.replaceChildren();

    const heading = document.createElement("h3");
    heading.textContent = "Writing Pattern Breakdown";
    sentenceResults.appendChild(heading);

    const details = [
        ["Sentence length consistency", results.consistencyScore],
        ["Vocabulary repetition", results.repetitionScore],
        ["Repeated sentence starters", results.starterScore]
    ];

    details.forEach(([label, score]) => {

        const paragraph = document.createElement("p");

        paragraph.textContent = `${label}: ${score}/100`;

        sentenceResults.appendChild(paragraph);

    });

    const statistics = document.createElement("p");

    statistics.textContent =
        `Words analysed: ${results.wordCount} | ` +
        `Sentences analysed: ${results.sentenceCount} | ` +
        `Average sentence length: ${results.averageLength} words`;

    sentenceResults.appendChild(statistics);

    const disclaimer = document.createElement("p");

    disclaimer.textContent =
        "This score measures selected writing patterns only. " +
        "It is NOT an AI probability score and cannot establish " +
        "whether text was written by a human or AI.";

    disclaimer.style.color = "#aab8c9";

    sentenceResults.appendChild(disclaimer);

    resultsSection.style.display = "block";
}

// ANALYSE BUTTON
analyseButton.addEventListener("click", () => {

    const text = detectorText.value.trim();

    if (text.length < 100) {
        alert("Please enter at least 100 characters.");
        return;
    }

    analyseButton.disabled = true;
    analyseButton.textContent = "Analysing...";

    try {

        const results = analyseWriting(text);

        displayResults(results);

    } catch (error) {

        alert(error.message);

    } finally {

        analyseButton.disabled = false;
        analyseButton.textContent = "Analyse Text";

    }

});
