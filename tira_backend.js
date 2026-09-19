const express = require("express");
const cors = require("cors");

const app = express();
const PORT = Number(process.env.PORT) || 8080;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_HISTORY_MESSAGES = 20;
const MAX_REQUESTS_PER_MINUTE = 30;

const allowedOrigin = process.env.ALLOWED_ORIGIN;
app.use(cors(allowedOrigin ? { origin: allowedOrigin } : undefined));
app.use(express.json({ limit: "128kb" }));

// Small in-memory development limiter. It is intentionally not persistent.
const requestTimes = new Map();

const MODES = {
    friendly: {
        tag: "😊 Friendly Vibes", emojis: "🌼😊",
        replies: ["Aww that's sweet!", "Haha I get you!", "Tell me more!" ]
    },
    sassy: {
        tag: "😏 Sassy Mode", emojis: "😤🔥",
        replies: ["Bro be serious rn 😭", "Nah you wildin' 💀", "Try again, bestie 😭🔥"]
    },
    genz_advice: {
        tag: "💡 Gen-Z Brainwave", emojis: "🧠⚡",
        replies: ["Lowkey? You got this.", "Real talk: you're better than you think.", "Touch some grass fr fr (lovingly)."]
    },
    helpful: {
        tag: "📘 Helpful Mode", emojis: "📘✨",
        replies: ["Okay, here's what you can do:", "Let me break it down:", "Short answer: yes. Long answer: maybe."]
    },
    flirty_pg: {
        tag: "✨ Flirty Glow", emojis: "💞😉",
        replies: ["You're kinda cute ngl 👀", "Why you sounding so adorable rn 😭💞", "Stop, I'm blushing ✨"]
    }
};

// Preserve the original frontend mode name as an alias.
MODES.flirty_nonexplicit = MODES.flirty_pg;

function clientIsAllowed(req) {
    const now = Date.now();
    const key = req.ip || "unknown";
    const recent = (requestTimes.get(key) || []).filter(t => now - t < 60000);
    recent.push(now);
    requestTimes.set(key, recent);
    return recent.length <= MAX_REQUESTS_PER_MINUTE;
}

function validateHistory(history) {
    if (history === undefined) return [];
    if (!Array.isArray(history)) throw new Error("history must be an array");
    return history.slice(-MAX_HISTORY_MESSAGES).filter(item =>
        item && (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" && item.content.length <= MAX_MESSAGE_LENGTH
    );
}

function normalizeRequest(body) {
    if (!body || typeof body.message !== "string" || !body.message.trim()) {
        return { error: "message must be a non-empty string" };
    }
    const message = body.message.trim();
    if (message.length > MAX_MESSAGE_LENGTH) return { error: "message is too long" };

    const requestedMode = typeof body.mode === "string" ? body.mode : "friendly";
    const mode = requestedMode === "flirty_nonexplicit" ? "flirty_pg" : requestedMode;
    if (!MODES[mode]) return { error: "unsupported mode" };

    const parsedRudeness = Number(body.rudeness);
    const rudeness = Number.isFinite(parsedRudeness)
        ? Math.min(10, Math.max(0, parsedRudeness)) : 0;
    let history;
    try { history = validateHistory(body.history); }
    catch (error) { return { error: error.message }; }

    return { message, mode, rudeness, history, consent: body.consent === true };
}

// Simple mood system
function generateResponse({ mode, rudeness }) {
    const config = MODES[mode];
    let reply = config.replies[Math.floor(Math.random() * config.replies.length)];
    if (mode === "sassy" && rudeness >= 7) reply = "Okayyy, that's a bold take 😭🔥";
    return reply;
}

app.post("/chat", (req, res) => {
    if (!clientIsAllowed(req)) return res.status(429).json({ success: false, error: "Too many requests" });
    const input = normalizeRequest(req.body);
    if (input.error) return res.status(400).json({ success: false, error: input.error });

    if (input.mode === "flirty_pg" && !input.consent) {
        return res.json({
            flagged: true,
            success: false,
            reply: "",
            mood_tag: "",
            emojis: "",
            error: "Consent is required for flirty mode"
        });
    }

    const config = MODES[input.mode];

    res.json({
        flagged: false,
        success: true,
        reply: generateResponse(input),
        mood_tag: config.tag,
        emojis: config.emojis,
        mode: input.mode
    });
});

app.use((error, req, res, next) => {
    if (error instanceof SyntaxError && error.status === 400) {
        return res.status(400).json({ success: false, error: "Invalid JSON" });
    }
    console.error("Request failed:", error.message);
    res.status(500).json({ success: false, error: "TIRA is having a moment. Try again in a sec." });
});

app.listen(PORT, () => {
    console.log(`TIRA server running on http://localhost:${PORT}`);
});

