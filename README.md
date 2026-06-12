# Wingmann 💜

A modern real-time chat app built for real conversations. No swiping, no algorithms.

## Live Demo
🔗 [wingmann-henna.vercel.app](https://wingmann-henna.vercel.app)

## Features

- **Dark Cosmos Landing Page** — animated starfield, shooting stars, aurora gradients
- **Google Authentication** — Firebase-powered one-click sign in
- **Real-time Chat** — Socket.io powered instant messaging
- **Online/Offline Status** — live socket-based presence detection
- **Typing Indicators** — see when someone is typing in real time
- **AI Moderation** — Gemini AI keeps conversations respectful
- **Emoji Picker** — full emoji support in chat
- **Mobile Responsive** — works on all screen sizes

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React + Vite |
| Auth | Firebase |
| Realtime | Socket.io |
| Backend | Node.js + Express |
| Frontend Deploy | Vercel |
| Backend Deploy | Render |

## Local Development

1. Clone the repo
   git clone https://github.com/ShradhaBiradar100/Wingmann.git
   cd Wingmann

2. Install dependencies
   cd client && npm install
   cd ../server && npm install

3. Create client/.env
   VITE_FIREBASE_API_KEY=your_key
   VITE_FIREBASE_AUTH_DOMAIN=your_domain
   VITE_FIREBASE_PROJECT_ID=your_project_id
   VITE_FIREBASE_STORAGE_BUCKET=your_bucket
   VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
   VITE_FIREBASE_APP_ID=your_app_id
   VITE_SERVER_URL=http://localhost:3001

4. Run locally
   Terminal 1: cd server && npm start
   Terminal 2: cd client && npm run dev

   Open http://localhost:5173

## Project Structure

    wingmann/
    ├── client/
    │   ├── src/
    │   │   ├── App.jsx          # Auth flow and routing
    │   │   ├── LandingPage.jsx  # Dark cosmos landing page
    │   │   ├── Chat.jsx         # Main chat interface
    │   │   └── firebase.js      # Firebase config
    │   └── vite.config.js
    └── server/
        └── index.js             # Express + Socket.io server

## App Flow

    New user   → Landing Page → Google Login → Chat
    Returning  → Chat (Firebase session restored)
    Logout     → Landing Page

Built with ♥ in Bangalore
