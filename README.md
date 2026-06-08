# ☕ Wingmann — AI-Powered Chat with Smart Moderation

> A real-time web messaging platform with an intelligent content moderation layer, built to keep conversations safe and on-platform until users are ready to meet IRL.

![Tech Stack](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Socket.io](https://img.shields.io/badge/Socket.io-010101?style=for-the-badge&logo=socketdotio&logoColor=white)
![Firebase](https://img.shields.io/badge/Firebase-FFCA28?style=for-the-badge&logo=firebase&logoColor=black)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-4285F4?style=for-the-badge&logo=google&logoColor=white)

---

## 📸 Preview

| Login Screen | Chat Interface | Moderation in Action |
|---|---|---|
| Google OAuth popup with glassmorphism UI | WhatsApp-style layout with purple gradient | Red bubble + warning for blocked messages |

---

## 🧠 Project Architecture

```
wingmann/
├── client/                        ← React Frontend (Vite + Tailwind)
│   └── src/
│       ├── App.jsx                ← Root component, auth state management
│       ├── Chat.jsx               ← Main chat UI + Socket.io logic
│       ├── firebase.js            ← Firebase initialization & exports
│       └── index.css              ← Tailwind CSS import
│
└── server/                        ← Node.js Backend
    ├── index.js                   ← Express + Socket.io server
    ├── moderator.js               ← AI moderation (Regex + Gemini AI)
    └── .env                       ← Secret API keys (not pushed to GitHub)
```

---

## 🔄 System Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (React)                         │
│                                                                   │
│   Google Login ──► Firebase Auth ──► User Object                │
│                                           │                       │
│   User types message ──► Socket.io emit ─►│                      │
└───────────────────────────────────────────┼───────────────────── ┘
                                            │
                                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                      BACKEND (Node.js + Express)                  │
│                                                                   │
│   Receive 'send_message' event                                   │
│          │                                                        │
│          ▼                                                        │
│   ┌─────────────────────────────────────────┐                   │
│   │         MODERATION PIPELINE              │                   │
│   │                                          │                   │
│   │  Step 1: Normalize Text                  │                   │
│   │  • Convert emoji numbers (9⃣ → 9)        │                   │
│   │  • Convert written numbers (nine → 9)    │                   │
│   │  • Remove spaces, special chars          │                   │
│   │               │                          │                   │
│   │               ▼                          │                   │
│   │  Step 2: Regex Layer (< 1ms)             │                   │
│   │  • Phone number patterns                 │                   │
│   │  • Social media handles & platforms      │                   │
│   │  • Physical address patterns             │                   │
│   │               │                          │                   │
│   │        ┌──────┴──────┐                   │                   │
│   │      BLOCK         PASSES                │                   │
│   │        │               │                 │                   │
│   │        │               ▼                 │                   │
│   │        │   Step 3: Gemini AI (~400ms)    │                   │
│   │        │   • Contextual understanding    │                   │
│   │        │   • Catches evasion attempts    │                   │
│   │        │   • False positive protection   │                   │
│   │        │        │                        │                   │
│   │        │   ┌────┴────┐                   │                   │
│   │        │  BLOCK    ALLOW                 │                   │
│   └────────┼────────────────────────────── ──┘                   │
│            │              │                                       │
│            ▼              ▼                                       │
│     socket.emit      io.to(recipientId)                          │
│   (sender only)         .emit()                                  │
│   message_blocked    receive_message                             │
└─────────────────────────────────────────────────────────────────┘
            │              │
            ▼              ▼
┌───────────────┐  ┌───────────────────────────┐
│    SENDER     │  │         RECIPIENT          │
│               │  │                            │
│ Red bubble    │  │ Normal message bubble      │
│ ⚠ blocked    │  │ (never knows msg blocked)  │
│ Warning msg   │  │                            │
└───────────────┘  └───────────────────────────┘
```

---

## ⚡ Socket.io Event Architecture

```
CLIENT ──────────────────────────────────────► SERVER
  user_join      → Register user on connect
  send_message   → Send message for moderation
  typing         → Notify recipient user is typing

SERVER ──────────────────────────────────────► CLIENT
  users_update      → Broadcast online user list (all)
  message_delivered → Confirm delivery to sender
  message_blocked   → Notify sender of block (sender only)
  receive_message   → Deliver message to recipient only
  user_typing       → Show typing indicator to recipient
```

---

## 🛡️ Moderation Test Cases

### ✅ Blocked (Should Never Reach Recipient)

| Input | Detection Layer | Reason |
|---|---|---|
| `My number is 9876543210` | Regex | 10+ digit sequence |
| `Call me at +91 987-654-3210` | Regex | International phone format |
| `nine eight seven six five...` | Regex | Written numbers converted to digits |
| `9⃣8⃣7⃣6⃣5⃣4⃣3⃣2⃣1⃣0⃣` | Regex | Emoji numbers converted |
| `What's your Instagram?` | Regex | Social platform name |
| `Add me on snap: user123` | Regex | Snapchat reference |
| `Let's move to WhatsApp` | Regex | Platform name |
| `My IG is @john_doe` | Regex | Handle + platform |
| `hit me up on telegram` | Regex | Platform name |
| `hit me up on the gram` | Gemini AI | Contextual slang |
| `my digits are...` | Gemini AI | Contextual phone reference |
| `Let's meet at 123 Main Street` | Regex | Physical address |
| `Come to flat 4B on Oak Avenue` | Regex | Address pattern |

### ✅ Allowed (False Positives Handled)

| Input | Why Allowed |
|---|---|
| `I have 2 dogs and 4 cats` | Numbers in normal context |
| `I snapped at my boss today` | 'snap' as verb, not app |
| `Let's meet at one of the Wingmann cafes!` | Encouraged behavior |

---

## 🚀 Tech Stack

### Frontend
- **React.js** — Component-based UI
- **Vite** — Lightning fast build tool
- **Tailwind CSS** — Utility-first styling
- **Socket.io Client** — Real-time connection
- **Firebase SDK** — Auth + Firestore

### Backend
- **Node.js + Express** — Server framework
- **Socket.io** — WebSocket server
- **@google/generative-ai** — Gemini AI moderation
- **Firebase Admin** — Server-side auth verification
- **dotenv** — Environment variable management
- **cors** — Cross-origin request handling

### Services
- **Firebase Authentication** — Google OAuth
- **Firebase Firestore** — Cloud NoSQL database
- **Google Gemini AI** — Contextual moderation (free tier)
- **DiceBear** — Avatar generation fallback

---

## 🏃 Running Locally

### Prerequisites
- Node.js v22+
- A Firebase project with Google Auth + Firestore enabled
- A Gemini API key (free at aistudio.google.com)

### Setup

```bash
# Clone the repo
git clone https://github.com/YOUR_USERNAME/wingmann.git
cd wingmann

# Install server dependencies
cd server && npm install

# Install client dependencies
cd ../client && npm install
```

### Environment Variables

Create `server/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
PORT=3001
```

Create `client/src/firebase.js` with your Firebase config:

```js
const firebaseConfig = {
  apiKey: "your_api_key",
  authDomain: "your_project.firebaseapp.com",
  projectId: "your_project_id",
  storageBucket: "your_project.firebasestorage.app",
  messagingSenderId: "your_sender_id",
  appId: "your_app_id"
};
```

### Run

```bash
# Terminal 1 — Start backend
cd server && node index.js

# Terminal 2 — Start frontend
cd client && npm run dev
```

Open **http://localhost:5173** in your browser.

To test chat: open an incognito window and log in with a different Google account.

---

## 👤 Author

**Shradha Biradar**
- Java Full Stack Developer
- Built for Wingmann technical assignment

---

## 📄 License

This project was built as a technical assignment for Wingmann.
