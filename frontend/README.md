# Agentic Workflow Engine - Frontend

Next.js 14 frontend for the multi-agent workflow execution engine.

## Features

- **Task Submission**: Submit complex task descriptions
- **Real-time Polling**: Polls backend for execution status (1s intervals)
- **Agent Mode Integration**: Displays interpreted task and execution results
- **Cost Tracking**: Shows total API cost for execution
- **Dark Theme**: Professional dark UI with Tailwind CSS

## Tech Stack

- **Next.js 14** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Styling and responsive design
- **Lucide React** - UI icons
- **Axios** - HTTP client

## Setup

```bash
cd frontend
npm install
```

## Development

```bash
npm run dev
```

Frontend runs on `http://localhost:3000`

Backend API must be running on `http://localhost:8001/api`

## Build

```bash
npm run build
npm start
```

## Architecture

- **page.tsx**: Main task submission page with polling logic
- **globals.css**: Tailwind CSS configuration
- **layout.tsx**: Root layout with metadata

## Environment

Create `.env.local` if needed for custom API endpoint:

```
NEXT_PUBLIC_API_BASE=http://localhost:8001/api
```
