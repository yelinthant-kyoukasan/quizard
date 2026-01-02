const fs = require("fs");
const path = require("path");
const csv = require("csv-parser");

const dataPath = path.join(__dirname, "..", "..", "data", "examples");

const store = {
    subjects: [],
    lessons: [],
    questions: []
};

function loadCsv(filename) {
    return new Promise((resolve, reject) => {
        const results = [];
        fs.createReadStream(path.join(dataPath, filename))
            .pipe(csv())
            .on("data", (data) => results.push(data))
            .on("end", () => resolve(results))
            .on("error", reject);
    });
}

async function loadAllData() {
    store.subjects = await loadCsv("subjects.csv");
    store.lessons = await loadCsv("lessons.csv");
    store.questions = await loadCsv("questions.csv");

    console.log("📦 CSV data loaded:");
    console.log(`- Subjects: ${store.subjects.length}`);
    console.log(`- Lessons: ${store.lessons.length}`);
    console.log(`- Questions: ${store.questions.length}`);
}

function getStore() {
    return store;
}

module.exports = {
    loadAllData,
    getStore
};
