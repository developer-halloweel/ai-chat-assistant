# AI Chat Assistant

A full-stack AI chat application with real-time streaming, conversation history, and tone customization — built with Node.js, Express, MongoDB, and Vanilla JS.

---

## ✨ Features

- **Real-time Streaming** — AI responses appear character-by-character via SSE (Server-Sent Events)
- **Tone Toggle** — Switch between **Professional**, **Casual**, and **Concise** modes; applied as system instructions to every API request
- **Conversation History** — All threads persisted in MongoDB with timestamps; browsable in the sidebar
- **Search** — Filter past conversations by title in the sidebar
- **Dark Glassmorphism UI** — Premium dark theme with micro-animations, floating welcome screen, and responsive layout
- **Markdown rendering** — AI responses render code blocks, bold, italic, lists, and headers

---

## 🏗️ Architecture

```
Project_101/
├── backend/
│   ├── server.js                    # Express entry point
│   ├── .env.example                 # Environment template
│   └── src/
│       ├── config/database.js       # MongoDB connection
│       ├── models/Conversation.js   # Mongoose schema
│       ├── services/aiService.js    # OpenAI streaming + tone system prompts
│       ├── controllers/chatController.js  # Business logic (SSE, CRUD)
│       ├── routes/chat.js           # Route definitions
│       └── middleware/errorHandler.js
└── frontend/
    ├── index.html
    ├── css/styles.css
    └── js/
        ├── api.js      # Backend HTTP + SSE client
        ├── ui.js       # DOM rendering (bubbles, streaming, toasts)
        ├── sidebar.js  # Conversation history sidebar
        └── app.js      # State management + event wiring
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **MongoDB** running locally on `localhost:27017`
- An **OpenAI API key**

### 1. Backend Setup

```bash
cd backend
npm install

# Copy the environment template
copy .env.example .env
# Edit .env and add your OPENAI_API_KEY
```

### 2. Start the Backend

```bash
cd backend
npm run dev       # Development (with nodemon)
# or
npm start         # Production
```

The API will be available at **http://localhost:5000**

### 3. Open the Frontend

Open `frontend/index.html` directly in your browser, or serve it with any static file server:

```bash
# Using Python (if available)
cd frontend
python -m http.server 3000

# Using Node.js http-server
npx http-server frontend -p 3000
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/chat/stream` | Stream AI response (SSE) |
| `GET`  | `/api/conversations` | List all conversations |
| `GET`  | `/api/conversations/:id` | Get single conversation |
| `DELETE` | `/api/conversations/:id` | Delete conversation |

### SSE Events (POST /api/chat/stream)

| Event | Data | Description |
|-------|------|-------------|
| `conversation_id` | `{ conversationId }` | Assigned conversation ID |
| `token` | `{ token }` | Single streamed text token |
| `done` | `{ conversationId, title }` | Stream complete, DB saved |
| `error` | `{ message }` | Error occurred |

---

## 🎨 Tone Modes

| Tone | System Instruction Effect |
|------|--------------------------|
| **Professional** | Formal, structured, expert-level responses |
| **Casual** | Friendly, conversational, uses contractions |
| **Concise** | Brief bullet points, leads with answer |

---

## 🌿 Git Commit History

```
init: project scaffold with backend/frontend structure
feat(backend): MongoDB connection and Conversation model
feat(backend): AI service with OpenAI streaming and tone modifiers
feat(backend): chat routes and SSE stream controller
feat(frontend): base HTML structure and dark glassmorphism design system
feat(frontend): chat bubbles, streaming view, and tone toggle UI
feat(frontend): history sidebar with conversation threads
feat(frontend): API integration and SSE streaming client
chore: env example, README, and final cleanup
```

---

## ⚙️ Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `5000` | Backend server port |
| `MONGO_URI` | `mongodb://localhost:27017/ai_chat_assistant` | MongoDB connection string |
| `OPENAI_API_KEY` | — | **Required** — Your OpenAI API key |
| `OPENAI_MODEL` | `gpt-4o` | OpenAI model to use |
| `FRONTEND_URL` | `*` | CORS allowed origin |
