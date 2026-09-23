# Chatly — Full-Stack Real-Time Chat App

Next.js + NestJS + Socket.IO + Prisma + PostgreSQL.

This README has **every command** you need, in order, from an empty Windows 11 machine to a fully working chat app running in your browser.

---

## 0. Install these first (skip any you already have)

| Tool | Download | Verify with |
|---|---|---|
| Node.js (LTS) | https://nodejs.org | `node --version` |
| PostgreSQL | https://www.postgresql.org/download/windows/ | `psql --version` |
| Git (optional) | https://git-scm.com/download/win | `git --version` |
| VS Code (optional) | https://code.visualstudio.com | — |

While installing PostgreSQL, **write down the password** you set for the `postgres` user — you'll need it below.

---

## 1. Create the database

Open **pgAdmin 4** (installed with PostgreSQL) or run this in Command Prompt:

```bash
psql -U postgres
```

Enter your password, then at the `postgres=#` prompt run:

```sql
CREATE DATABASE chatapp;
\q
```

*(Alternative: if you'd rather use Docker instead of installing PostgreSQL directly, run `docker compose up -d` from the `chat-app/` folder — it creates the same database automatically. Only do one or the other, not both.)*

---

## 2. Backend setup

```bash
cd chat-app/backend
npm install
```

This reads `package.json` and downloads every library the backend needs into a `node_modules` folder (NestJS, Prisma, Socket.IO, etc.). This can take a minute or two.

**Create your real environment file:**

```bash
copy .env.example .env
```

Open `backend/.env` in VS Code and edit these two lines:

```
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/chatapp?schema=public"
```
Replace `YOUR_PASSWORD` with the PostgreSQL password you set in step 0.

```
JWT_ACCESS_SECRET="replace-with-a-long-random-string"
JWT_REFRESH_SECRET="replace-with-a-different-long-random-string"
```
Replace both with any long random text (20+ random characters each — mash your keyboard). These two must be **different** from each other.

**Create the actual database tables from our schema:**

```bash
npx prisma migrate dev --name init
```

Expected output: it prints each table it created (User, Conversation, Message, etc.) and ends with `Your database is now in sync with your schema.`

**Start the backend:**

```bash
npm run start:dev
```

Expected output:
```
Backend running on http://localhost:4000
```

Leave this terminal window open and running. Test it worked by opening this URL in your browser:
```
http://localhost:4000/api/auth/login
```
You should see a JSON error like `{"message":["identifier must be a string", ...]}` — that's correct! It means the server is alive and correctly rejecting an empty request.

---

## 3. Frontend setup

Open a **second** terminal window (keep the backend one running).

```bash
cd chat-app/frontend
npm install
```

**Create your environment file:**

```bash
copy .env.local.example .env.local
```

The default values already match the backend (`http://localhost:4000`), so no editing needed unless you changed the backend's port.

**Start the frontend:**

```bash
npm run dev
```

Expected output:
```
- Local:        http://localhost:3000
```

Open **http://localhost:3000** in your browser. You should land on the login page.

---

## 4. Test the whole thing end-to-end

1. Click "Sign up", create **User A** (e.g. username `alice`).
2. You'll be logged in and land on an empty chat screen.
3. Open a **second browser** (or an Incognito/Private window) to `http://localhost:3000`.
4. Sign up as **User B** (e.g. username `bob`).
5. As Bob, click the pencil icon (new conversation), search "alice", click her to start a chat.
6. Type "Hello!" and press Enter.
7. Switch to Alice's window — the message should appear **instantly**, no refresh needed.
8. Try: reacting with an emoji, replying to a message, editing your own message, deleting a message, and watch the "typing..." indicator appear when the other person types.

If real-time messages don't appear instantly, check the backend terminal for errors, and make sure both `npm run start:dev` and `npm run dev` are still running.

---

## Everyday commands (after the first-time setup above)

Every time you come back to work on this project:

```bash
# Terminal 1
cd chat-app/backend
npm run start:dev

# Terminal 2
cd chat-app/frontend
npm run dev
```

If PostgreSQL isn't already running as a Windows service, start it from the Start Menu ("pgAdmin" or "Services" app), or run `docker compose up -d` from `chat-app/` if you're using Docker.

## Useful Prisma commands

```bash
# Open a visual database browser in your browser at localhost:5555
npx prisma studio

# After you edit prisma/schema.prisma, apply the changes to your database
npx prisma migrate dev --name describe_your_change
```

## Project structure

```
chat-app/
├── backend/            NestJS API + WebSocket server (port 4000)
│   ├── prisma/schema.prisma   Database table definitions
│   ├── src/
│   │   ├── auth/               Register, login, JWT, refresh tokens
│   │   ├── users/               Profiles, search
│   │   ├── conversations/       Chat list, pin/mute
│   │   ├── messages/             Send/edit/delete/react, history
│   │   ├── websocket/            Real-time Socket.IO gateway
│   │   ├── files/                 File/image/voice upload
│   │   └── notifications/        In-app notifications
│   └── uploads/                    Uploaded images/files land here
│
├── frontend/           Next.js app (port 3000)
│   ├── app/               Pages (login, register, chat)
│   ├── components/       UI building blocks
│   ├── hooks/               Real-time data hooks
│   ├── context/            Auth + theme providers
│   └── lib/                    API client + socket connection
│
└── docker-compose.yml   Optional: run PostgreSQL in Docker instead
```
