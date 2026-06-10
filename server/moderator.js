const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash-latest" });

function convertEmojiNumbers(text) {
  return text
    .replace(/0⃣/g, '0').replace(/1⃣/g, '1').replace(/2⃣/g, '2')
    .replace(/3⃣/g, '3').replace(/4⃣/g, '4').replace(/5⃣/g, '5')
    .replace(/6⃣/g, '6').replace(/7⃣/g, '7').replace(/8⃣/g, '8')
    .replace(/9⃣/g, '9').replace(/0️⃣/g, '0').replace(/1️⃣/g, '1')
    .replace(/2️⃣/g, '2').replace(/3️⃣/g, '3').replace(/4️⃣/g, '4')
    .replace(/5️⃣/g, '5').replace(/6️⃣/g, '6').replace(/7️⃣/g, '7')
    .replace(/8️⃣/g, '8').replace(/9️⃣/g, '9');
}

function convertWrittenNumbers(text) {
  const map = { zero:'0',one:'1',two:'2',three:'3',four:'4',five:'5',six:'6',seven:'7',eight:'8',nine:'9',niner:'9',ate:'8' };
  let out = text.toLowerCase();
  for (const [w,d] of Object.entries(map)) {
    out = out.replace(new RegExp('\\b'+w+'\\b','gi'), d);
  }
  return out;
}

function regexCheck(message) {
  let processed = convertEmojiNumbers(message);
  processed = convertWrittenNumbers(processed);
  const digitsOnly = processed.replace(/\D/g, '');

  if (digitsOnly.length >= 10) return { blocked:true, reason:'Phone number detected' };

  const socialPatterns = [
    /instagram|insta\b|\big\b/i, /snapchat|\bsnap\b(?!ped|ping)/i,
    /whatsapp|whats app/i, /telegram/i, /\bfacebook\b|\bfb\b/i,
    /\btwitter\b|\btweet\b/i, /\btiktok\b/i, /\blinkedin\b/i,
    /the gram\b/i, /hit me up on/i, /find me on/i, /add me on/i,
  ];
  for (const p of socialPatterns) {
    if (p.test(message)) return { blocked:true, reason:'Social media reference detected' };
  }

  if (/@[a-z0-9._]+/i.test(message)) return { blocked:true, reason:'Handle detected' };

  const locationPatterns = [
    /\bwill be (at|near|in|outside|by)\b/i,
    /\bi('ll| will) be (at|near|in|outside|by)\b/i,
    /\bnear\b.{0,30}\b(cafe|coffee|restaurant|place|shop|mall|park|road|street|layout|nagar)/i,
    /\b(at|in|near|outside|by)\b.{0,20}\b(cafe|coffee|restaurant|bar|pub|mall|park)/i,
    /\bolive\b/i,
    /\bbtm\b|\bbtm layout\b/i,
    /\bkoramangala\b|\bindiranagar\b|\bjayanagar\b|\bmg road\b/i,
    /\bcome (here|there|to my|over)/i,
    /\bmeet (me|us|up)? ?(at|in|near|outside|by)/i,
    /\blet's meet\b|\blets meet\b/i,
    /\bpick you up\b|\bi'll come\b|\bcome outside\b/i,
    /\bmy (place|house|home|flat|apartment|address|location)/i,
    /\bwhere (do you|are you) live/i,
    /\bshare (your|ur) location/i,
    /\d+\s+\w+\s+(street|st|avenue|ave|road|rd|lane|ln|blvd)/i,
  ];
  for (const p of locationPatterns) {
    if (p.test(message)) return { blocked:true, reason:'Location/meetup info detected' };
  }

  const profanity = [
    /\bf+u+c+k/i, /\bsh+it/i, /\bb+itch/i, /\basshole/i,
    /\bmotherfucker/i, /\bcunt/i, /\bdick\b/i, /\bslut/i, /\bwhore/i
  ];
  for (const p of profanity) {
    if (p.test(message)) return { blocked:true, reason:'Abusive language detected' };
  }

  return { blocked:false };
}

async function geminiCheck(message) {
  const prompt = 'You are a moderation AI for Wingmann, a dating app. Users must only meet at Wingmann partnered cafes. Block if the message contains: phone numbers in any form, social media handles or platforms, specific locations or addresses, meetup suggestions outside Wingmann cafes, abusive language, harassment. Allow normal conversation. Message: "' + message + '". Respond ONLY with JSON: {"blocked":true/false,"reason":"brief reason"}';
  try {
    const result = await model.generateContent(prompt);
    const text = result.response.text().trim().replace(/```json|```/g,'').trim();
    return JSON.parse(text);
  } catch(err) {
    console.error('Gemini error:', err);
    return { blocked:false };
  }
}

async function moderateMessage(message) {
  const r = regexCheck(message);
  if (r.blocked) return r;
  return await geminiCheck(message);
}

module.exports = { moderateMessage };
