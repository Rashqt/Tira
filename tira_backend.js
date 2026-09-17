const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Simple mood system
function getMoodTag(mode) {
    const moods = {
        friendly: "😊 Friendly Vibes",
        sassy: "😏 Sassy Mode",
        genz_advice: "💡 Gen-Z Brainwave",
        flirty_nonexplicit: "✨ Flirty Glow",
        helpful: "📘 Helpful Mode"
    };
    return moods[mode] || "";
}

function getEmojis(mode) {
    const packs = {
        friendly: "🌼😊",
        sassy: "😤🔥",
        genz_advice: "🧠⚡",
        flirty_nonexplicit: "💞😉",
        helpful: "📘✨"
    };
    return packs[mode] || "";
}

// Main reply generator
function generateReply(message, mode, rudeness) {
    if (!message || message.trim() === "") {
        return "Say something first 😭";
    }

    const baseReplies = {
        friendly: ["Aww that's sweet!", "Haha I get you!", "Tell me more!"],
        sassy: ["Bro be serious rn 😭", "Nah you wildin' 💀", "Try again clown 😭🔥"],
        genz_advice: ["Lowkey? You got this.", "Real talk: you're better than you think.", "Touch some grass fr fr (lovingly)."],
        flirty_nonexplicit: ["You're kinda cute ngl 👀", "Why you sounding so adorable rn 😭💞", "Stop, I'm blushing ✨"],
        helpful: ["Okay so here's what you can do:", "Let me break it down:", "Short answer: yes. Long answer: maybe."]
    };

    let list = baseReplies[mode] || ["Hmm okay.", "Say that again?"];

    // Rudeness scaling (for fun)
    if (mode === "sassy") {
        list.push("Bro ur message gave me brain damage 😭🔥".repeat(rudeness > 7 ? 1 : 0));
    }

    return list[Math.floor(Math.random() * list.length)];
}

app.post("/chat", (req, res) => {
    const { message, mode, rudeness, consent } = req.body;

    // Safety check
    if (mode === "flirty_nonexplicit" && !consent) {
        return res.json({
            flagged: true,
            reply: "",
            mood_tag: "",
            emojis: ""
        });
    }

    const reply = generateReply(message, mode, rudeness);
    const mood_tag = getMoodTag(mode);
    const emojis = getEmojis(mode);

    res.json({
        flagged: false,
        reply,
        mood_tag,
        emojis
    });
});

app.listen(8080, () => {
    console.log("Backend running on http://localhost:8080");
});
