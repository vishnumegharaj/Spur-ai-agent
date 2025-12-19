# 🧠 Spur – AI Live Chat Support Agent

This project is a **mini AI-powered customer support chat system**, built as part of the **Founding Full-Stack Engineer take-home assignment for Spur**.

It simulates a real customer support experience where users can chat with an AI agent that:
- Understands store policies (shipping, returns, payments, support hours)
- Maintains conversation context
- Persists chat history
- Handles real-world AI failures gracefully

---

## 🚀 Features

- AI-powered live chat using a real LLM
- Persistent conversations (reload-safe)
- Session-based chat history
- Robust error handling (timeouts, retries, API failures)
- Markdown-rendered AI responses
- Typing indicator & clean UI
- Mobile-responsive frontend

---

## 🧩 Tech Stack

### Backend
- Node.js + TypeScript
- Express
- Prisma ORM
- SQLite (for local simplicity)
- Google Gemini (Generative AI)

### Frontend
- React (Create React App)
- TypeScript
- react-markdown for formatted AI responses

---

## 🛠️ How to Run Locally (Step by Step)

### 1️⃣ Clone the repository

```bash
git clone <your-repo-url>
cd <repo-name>
```

### 2️⃣ Backend Setup

```bash
cd backend
npm install
```

### 3️⃣ Environment Variables

Create a `.env` file inside `backend/`:

```env
DATABASE_URL="file:./dev.db"
GEMINI_API_KEY="your_google_gemini_api_key"
```

> ⚠️ The backend fails fast on startup if `GEMINI_API_KEY` is missing.

### 4️⃣ Database Setup (Prisma)

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 5️⃣ Start Backend Server

```bash
npm run dev
```

Backend runs at:
```
http://localhost:4000
```

### 6️⃣ Frontend Setup

```bash
cd ../frontend
npm install
npm start
```

Frontend runs at:
```
http://localhost:3000
```

---

## 🗂️ Database Design

### Conversation

| Field | Type |
|------|------|
| id | Int (PK, auto-increment) |
| createdAt | DateTime |

### Message

| Field | Type |
|------|------|
| id | Int (PK) |
| conversationId | Int (FK) |
| sender | "user" \| "ai" |
| text | String |
| createdAt | DateTime |

---

## 🧠 Architecture Overview

### Backend Structure

```
backend/
 ├─ src/
 │  ├─ routes/        # API routes (chat)
 │  ├─ services/      # LLM logic (Gemini integration)
 │  ├─ db/            # Prisma client
 │  ├─ server.ts      # App entry point
 ├─ prisma/
 │  ├─ schema.prisma
 └─ .env
```

### Design Principles

- Separation of concerns
- Stateless backend with session-based persistence
- Defensive programming around LLMs
- Fail-fast configuration for missing env vars

---

## 🤖 LLM Notes

### Provider Used
- Google Gemini
- Model: `gemini-2.0-flash-exp`

### Prompting Strategy
- System prompt embeds store knowledge
- Conversation history passed for context
- Clear formatting and hallucination avoidance

### Reliability
- Timeouts
- Retries with backoff
- Empty-response validation
- Graceful fallbacks

---

## ⚖️ Trade-offs

- No authentication
- Single-session per browser
- SQLite instead of PostgreSQL

---

## 🔮 If I Had More Time…

- Authentication
- PostgreSQL
- Streaming responses
- Admin dashboard
- Multi-channel support

---

## ✅ Final Notes

This project focuses on **clean architecture, reliability, and real-world UX**.
