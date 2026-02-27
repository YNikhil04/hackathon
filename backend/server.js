const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Gemini AI

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// --- MOCK DATABASE (Questions) ---
// --- MOCK DATABASE (Expanded Questions) ---
const questionsData = {
  jee: [
    {
      id: 101,
      subject: "Physics",
      question: "Dimensional formula of Gravitational Constant (G)?",
      options: ["[M-1 L3 T-2]", "[M1 L2 T-2]", "[M-1 L2 T-1]", "[M1 L3 T-2]"],
      correctAnswer: 0,
    },
    {
      id: 102,
      subject: "Maths",
      question: "The value of ∫ sin²x dx is:",
      options: [
        "x/2 - sin2x/4 + C",
        "x/2 + sin2x/4 + C",
        "cos²x + C",
        "sin³x/3 + C",
      ],
      correctAnswer: 0,
    },
    {
      id: 103,
      subject: "Chemistry",
      question: "Highest electron affinity element?",
      options: ["Fluorine", "Chlorine", "Oxygen", "Nitrogen"],
      correctAnswer: 1,
    },
    {
      id: 104,
      subject: "Physics",
      question: "Working principle of Optical Fiber?",
      options: [
        "Refraction",
        "Scattering",
        "Total Internal Reflection",
        "Dispersion",
      ],
      correctAnswer: 2,
    },
    {
      id: 105,
      subject: "Maths",
      question: "Derivative of e^(sin x) is:",
      options: [
        "e^(sin x)",
        "cos x * e^(sin x)",
        "sin x * e^(cos x)",
        "e^(cos x)",
      ],
      correctAnswer: 1,
    },
    {
      id: 106,
      subject: "Chemistry",
      question: "Which gas is known as Laughing Gas?",
      options: ["NO", "NO2", "N2O", "N2O5"],
      correctAnswer: 2,
    },
  ],
  gate: [
    {
      id: 201,
      subject: "CS",
      question: "Which data structure is used for BFS?",
      options: ["Stack", "Queue", "Tree", "Graph"],
      correctAnswer: 1,
    },
    {
      id: 202,
      subject: "CS",
      question: "Time complexity of Binary Search?",
      options: ["O(n)", "O(n log n)", "O(log n)", "O(1)"],
      correctAnswer: 2,
    },
    {
      id: 203,
      subject: "CS",
      question: "Which layer handles IP addressing?",
      options: ["Data Link", "Network", "Transport", "Physical"],
      correctAnswer: 1,
    },
    {
      id: 204,
      subject: "CS",
      question: "Smallest unit of data in a database?",
      options: ["Record", "Table", "Field", "File"],
      correctAnswer: 2,
    },
    {
      id: 205,
      subject: "CS",
      question: "Process of finding errors in code?",
      options: ["Compiling", "Executing", "Debugging", "Linking"],
      correctAnswer: 2,
    },
    {
      id: 206,
      subject: "CS",
      question: "HTTP port number?",
      options: ["21", "25", "80", "443"],
      correctAnswer: 2,
    },
  ],
};

// --- ENDPOINTS ---

// 1. Fetch Questions Based on Exam Type
app.post("/api/start-test", (req, res) => {
  const { examType } = req.body;
  const questions = questionsData[examType.toLowerCase()] || [];

  if (questions.length === 0) {
    return res
      .status(404)
      .json({ success: false, message: "Exam type not found" });
  }

  res.json({ success: true, questions });
});

// 2. Validate Answers
app.post("/api/submit-test", (req, res) => {
  const { examType, answers } = req.body; // answers: [{questionId, selectedOption}]
  const bank = questionsData[examType.toLowerCase()];

  const results = answers.map((userAns) => {
    const originalQ = bank.find((q) => q.id === userAns.questionId);
    return {
      questionId: userAns.questionId,
      correct: originalQ.correctAnswer === userAns.selectedOption,
      correctAnswer: originalQ.correctAnswer,
    };
  });

  res.json({ success: true, result: results });
});

// 3. AI Schedule Generator (Gemini Integration)
// Inside your server.js
// Inside your /api/optimize route in server.js
// ... (Keep your Express setup and questionsData the same)

app.post("/api/optimize", async (req, res) => {
  const { subjects, energy, hours } = req.body;

  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-1.5-flash", // Use the official stable model name
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
      ],
    });

    const prompt = `
      Create a 7-day study plan for a student struggling with: ${subjects.join(", ")}.
      Daily hours available: ${hours}. Energy level: ${energy}.
      
      Format your response exactly as a Markdown table.
      The table must have these 4 columns: | Day | Topic | Activity | Goal |
      Ensure there is a separator line under the header. Do not write anything before or after the table.
    `;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text || text.length < 10) {
      throw new Error("AI returned an empty or invalid response");
    }

    res.json({ success: true, text: text });
  } catch (error) {
    console.error("Backend Error:", error);
    res.status(500).json({
      success: false,
      error: "AI Generation Failed",
      message: error.message,
    });
  }
});

app.listen(5000, () => console.log("🚀 Server running on port 5000"));

app.listen(PORT, () => {
  console.log(`🚀 Backend Server running on http://localhost:${PORT}`);
});
