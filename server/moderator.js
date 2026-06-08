const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

// ─── LAYER 1: REGEX PATTERNS ───────────────────────────────────────────────

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/[@$!*]/g, 'a')
    .replace(/[.\-_]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Converts written numbers to digits
// "nine eight seven" → "987"
function convertWrittenNumbers(text) {
  const wordToDigit = {
    'zero': '0', 'one': '1', 'two': '2', 'three': '3', 'four': '4',
    'five': '5', 'six': '6', 'seven': '7', 'eight': '8', 'nine': '9',
    // Common misspellings / slang
    'niner': '9', 'ate': '8', 'won': '1', 'too': '2', 'to': '2',
    'for': '4', 'fore': '4', 'sex': '6', 'sev': '7', 'zer': '0'
  };

  let converted = text.toLowerCase();
  for (const [word, digit] of Object.entries(wordToDigit)) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    converted = converted.replace(regex, digit);
  }
  return converted;
}

// Converts emoji numbers to digits
// "9⃣8⃣7⃣" → "987"
function convertEmojiNumbers(text) {
  return text
    .replace(/0⃣/g, '0').replace(/1⃣/g, '1').replace(/2⃣/g, '2')
    .replace(/3⃣/g, '3').replace(/4⃣/g, '4').replace(/5⃣/g, '5')
    .replace(/6⃣/g, '6').replace(/7⃣/g, '7').replace(/8⃣/g, '8')
    .replace(/9⃣/g, '9')
    .replace(/0️⃣/g, '0').replace(/1️⃣/g, '1').replace(/2️⃣/g, '2')
    .replace(/3️⃣/g, '3').replace(/4️⃣/g, '4').replace(/5️⃣/g, '5')
    .replace(/6️⃣/g, '6').replace(/7️⃣/g, '7').replace(/8️⃣/g, '8')
    .replace(/9️⃣/g, '9');
}

function regexCheck(message) {
  // Step 1: Convert emoji numbers
  let processed = convertEmojiNumbers(message);

  // Step 2: Convert written numbers to digits
  processed = convertWrittenNumbers(processed);

  // Step 3: Normalize
  const normalized = normalizeText(processed);

  // Step 4: Extract only digits (strips spaces, dashes, dots between digits)
  const digitsOnly = processed.replace(/\D/g, '');

  // ── Phone number check ──
  // Any sequence of 10+ digits = phone number
  if (digitsOnly.length >= 10) {
    return { blocked: true, reason: "Phone number detected" };
  }

  // Spaced out digits like "9 8 7 6 5 4 3 2 1 0"
  const spacedDigits = processed.replace(/\s/g, '').replace(/\D/g, '');
  if (spacedDigits.length >= 10) {
    return { blocked: true, reason: "Spaced phone number detected" };
  }

  // ── Social media check ──
  const socialPatterns = [
    /instagram|insta\b|ig\b/i,
    /snapchat|\bsnap\b(?!ped|ping|s\b)/i,  // snap but not snapped/snapping
    /whatsapp|whats app/i,
    /telegram/i,
    /\bfacebook\b|\bfb\b/i,
    /\btwitter\b|\btweet\b/i,
    /\btiktok\b/i,
    /\blinkedin\b/i,
    /the gram\b/i,
    /the bird app/i,
    /hit me up on/i,
    /find me on/i,
    /add me on/i,
    /search for me on/i,
    /my (ig|insta|snap|handle|username) is/i,
  ];

  for (const pattern of socialPatterns) {
    if (pattern.test(message)) {
      return { blocked: true, reason: "Social media reference detected" };
    }
  }

  // ── Handle check ──
  if (/@[a-z0-9._]+/i.test(message)) {
    return { blocked: true, reason: "Social media handle detected" };
  }

  // ── Address check ──
  const addressPatterns = [
    /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|boulevard|blvd)/i,
    /flat\s+\w+|apartment\s+\w+|apt\s+\w+/i,
    /\d+(st|nd|rd|th)\s+floor/i,
  ];

  for (const pattern of addressPatterns) {
    if (pattern.test(message)) {
      return { blocked: true, reason: "Physical address detected" };
    }
  }
const profanityList = [
  /\bf+u+c+k/i, /\bsh+it/i, /\bb+itch/i,
  /\basshole/i, /\bmotherfucker/i, /\bmf\b/i,
  /\bcunt/i, /\bdick\b/i, /\bbastard/i,
  /\bslut/i, /\bwhore/i
];

for (const pattern of profanityList) {
  if (pattern.test(message)) {
    return { blocked: true, reason: "Abusive language detected" };
  }
}
  return { blocked: false };
}

// ─── LAYER 2: GEMINI AI ────────────────────────────────────────────────────

async function geminiCheck(message) {
  const prompt = `
You are a chat moderation AI for Wingmann, a dating app where users must meet at partnered cafes before exchanging personal contact info.

Analyze this message and respond with ONLY a JSON object, nothing else:
{"blocked": true/false, "reason": "brief reason"}

Block the message if it contains:
- Phone numbers in ANY form: digits, written out (nine eight seven), spaced out, emoji numbers, mixed formats
- Social media handles or platform names (Instagram, Snap, WhatsApp, Telegram, FB, Twitter, TikTok, "the gram", "the bird app", "hit me up on...")
- Physical addresses or specific non-Wingmann meetup locations with street names
- Harassment, abuse, profanity, slurs, or explicit content
- Requests for explicit images ("send me a pic of...")
- Any attempt to move conversation off-platform

ALLOW the message if:
- Numbers are used in normal context ("I have 2 dogs", "I'm 25 years old")
- "snap" is used as a verb ("I snapped at my boss today")
- User suggests meeting at Wingmann cafes specifically
- Normal everyday conversation

Message to analyze: "${message}"

Respond with ONLY valid JSON. No markdown, no explanation.
`;

  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim();
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  } catch (err) {
    console.error("Gemini error:", err);
    return { blocked: false, reason: "AI check failed, allowed by default" };
  }
}

// ─── MAIN MODERATION FUNCTION ──────────────────────────────────────────────

async function moderateMessage(message) {
  // Layer 1: Regex (instant, < 1ms)
  const regexResult = regexCheck(message);
  if (regexResult.blocked) return regexResult;

  // Layer 2: Gemini AI (contextual, ~400ms)
  const aiResult = await geminiCheck(message);
  return aiResult;
}

module.exports = { moderateMessage };