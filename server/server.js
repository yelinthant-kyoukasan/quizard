require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const morgan = require("morgan");
const helmet = require("helmet");
const authRoutes = require("./routes/authRoutes");
const subjectsRoutes = require("./routes/subjectsRoutes");
const lessonsRoutes = require("./routes/lessonsRoutes");
const questionsRoutes = require("./routes/questionsRoutes");
const quizRoutes = require("./routes/quizRoutes")
const progressRoutes = require("./routes/progressRoutes")
const leaderboardRoutes = require("./routes/leaderboardRoutes")
const friendsRoutes = require("./routes/friendsRoutes")
const battlesRoutes = require("./routes/battlesRoutes")
const tournamentsRoutes = require("./routes/tournamentsRoutes")

const connectDB = require("./config/db");

const app = express();

// Connect DB
connectDB();

// Middlewares
app.use(helmet());
app.use(morgan("dev"));
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: ["http://localhost:5173",
        "https://quizard-1e7bf.web.app/",
        "https://quizard-le7bf.firebaseapp.com"
    ],
    credentials: true
}));


app.use(cors({
    origin: (origin, cb) => {
        // allow tools like Postman (no origin) + allowed websites
        if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true // keep true only if you use cookies; ok even if you don't
}));

app.options("*", cors());
app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
});

app.use("/api/friends", friendsRoutes)
app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectsRoutes);
app.use("/api/lessons", lessonsRoutes);
app.use("/api/questions", questionsRoutes);
app.use("/api/quiz", quizRoutes)
app.use("/api/progress", progressRoutes)
app.use("/api/leaderboard", leaderboardRoutes)
app.use("/api/battles", battlesRoutes)
app.use("/api/tournaments", tournamentsRoutes)

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
