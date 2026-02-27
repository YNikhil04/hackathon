const express = require("express");
const cors = require("cors");
const app = express();
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

app.use(cors());
app.use(express.json());

// ─── Question Bank ───────────────────────────────────────────────────────────

const questionBank = {
  jee: [
    {
      id: 1,
      question:
        "A particle moves in a circle of radius 5 cm with constant speed 10 cm/s. What is the acceleration of the particle?",
      options: ["10 cm/s²", "20 cm/s²", "25 cm/s²", "5 cm/s²"],
      answer: 1,
      subject: "Physics",
    },
    {
      id: 2,
      question: "The number of orbitals in the 4th shell is:",
      options: ["8", "16", "4", "32"],
      answer: 1,
      subject: "Chemistry",
    },
    {
      id: 3,
      question: "If f(x) = x² - 3x + 2, find f(0) + f(1):",
      options: ["3", "2", "0", "1"],
      answer: 0,
      subject: "Maths",
    },
    {
      id: 4,
      question: "Which of the following is NOT a state function?",
      options: ["Enthalpy", "Entropy", "Work", "Internal Energy"],
      answer: 2,
      subject: "Chemistry",
    },
    {
      id: 5,
      question:
        "The de Broglie wavelength of an electron moving with velocity v is:",
      options: ["h/mv", "mv/h", "h*mv", "m/hv"],
      answer: 0,
      subject: "Physics",
    },
  ],
  gate: [
    {
      id: 1,
      question: "What is the time complexity of binary search?",
      options: ["O(n)", "O(log n)", "O(n²)", "O(1)"],
      answer: 1,
      subject: "Algorithms",
    },
    {
      id: 2,
      question:
        "Which of the following is NOT a type of process scheduling algorithm?",
      options: ["FCFS", "Round Robin", "Binary Sort", "Priority Scheduling"],
      answer: 2,
      subject: "OS",
    },
    {
      id: 3,
      question:
        "In a full binary tree with n leaves, the number of internal nodes is:",
      options: ["n", "n-1", "n+1", "2n"],
      answer: 1,
      subject: "Data Structures",
    },
    {
      id: 4,
      question: "Which normal form deals with multi-valued dependencies?",
      options: ["1NF", "2NF", "3NF", "4NF"],
      answer: 3,
      subject: "DBMS",
    },
    {
      id: 5,
      question: "What does the OSI model stand for?",
      options: [
        "Open Systems Interconnection",
        "Open Source Interface",
        "Operating System Integration",
        "None of these",
      ],
      answer: 0,
      subject: "Networks",
    },
  ],
};

// ─── Routes ───────────────────────────────────────────────────────────────────

// GET /api/exam-types  → return available exam types
app.get("/exam-types", (req, res) => {
  res.json({
    success: true,
    exams: [
      { id: "jee", label: "JEE", description: "Joint Entrance Examination" },
      {
        id: "gate",
        label: "GATE",
        description: "Graduate Aptitude Test in Engineering",
      },
    ],
  });
});

// POST /api/start-test  → activate test session based on exam type
app.post("/api/start-test", (req, res) => {
  const { examType } = req.body;

  if (!examType) {
    return res
      .status(400)
      .json({ success: false, message: "examType is required" });
  }

  const type = examType.toLowerCase();

  if (!questionBank[type]) {
    return res
      .status(404)
      .json({ success: false, message: `Exam type "${examType}" not found` });
  }

  // Shuffle & pick questions (pick all 5 here, you can slice as needed)
  const questions = questionBank[type]
    .sort(() => Math.random() - 0.5)
    .map(({ answer, ...q }) => q); // strip correct answer before sending to frontend

  // Generate a simple session token
  const sessionId = `${type}-${Date.now()}`;

  res.json({
    success: true,
    sessionId,
    examType: type.toUpperCase(),
    totalQuestions: questions.length,
    durationMinutes: type === "jee" ? 30 : 45,
    questions,
  });
});

// POST /api/submit-test  → evaluate answers and return score
app.post("/api/submit-test", (req, res) => {
  const { examType, answers } = req.body;
  // answers = [{ questionId, selectedOption }]

  if (!examType || !answers) {
    return res
      .status(400)
      .json({ success: false, message: "examType and answers are required" });
  }

  const type = examType.toLowerCase();
  const bank = questionBank[type];

  if (!bank) {
    return res
      .status(404)
      .json({ success: false, message: "Invalid exam type" });
  }

  let score = 0;
  const result = answers.map(({ questionId, selectedOption }) => {
    const question = bank.find((q) => q.id === questionId);
    if (!question) return { questionId, correct: false };

    const isCorrect = question.answer === selectedOption;
    if (isCorrect) score++;

    return {
      questionId,
      correct: isCorrect,
      correctAnswer: question.answer,
      yourAnswer: selectedOption,
    };
  });

  res.json({
    success: true,
    score,
    total: bank.length,
    percentage: ((score / bank.length) * 100).toFixed(1),
    result,
  });
});

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const SYSTEM_PROMPT = `
You are an expert Learning Scientist. Create a 'Friction-Based' study schedule. 
Rules:
1. High Difficulty + Low Focus = 15-min 'micro-wins'.
2. Easy Difficulty + High Focus = Suggest swapping for a harder task.
3. Brain Breaks (5-10 mins) every 50 mins.
4. Output: Markdown Table + 'Cognitive Insight' explanation.
`;

app.post("/api/optimize", async (req, res) => {
  // Destructure exactly what the React app sends
  const { energy, hours, subjects, isSevenDay } = req.body;

  if (!subjects || subjects.length === 0) {
    return res
      .status(400)
      .json({ success: false, error: "No subjects provided." });
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // Construct the actual prompt from the user's data
    const subjectContext = subjects
      .map((s) => `${s.name} (${s.difficulty})`)
      .join(", ");
    const userPrompt = `
      User Energy: ${energy}
      Study Hours: ${hours}
      Subjects: ${subjectContext}
      Task: Generate a ${isSevenDay ? "7-day" : "1-day"} Markdown study plan.
    `;

    const result = await model.generateContent([SYSTEM_PROMPT, userPrompt]);
    const response = await result.response;

    // Send back "text" to match the frontend expectation
    res.json({ success: true, text: response.text() });
  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ success: false, error: "AI Service Error" });
  }
});
// ─── Start Server ─────────────────────────────────────────────────────────────

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`✅ Exam Quiz Server running on http://localhost:${PORT}`);
});
