# Vikasana: Personal Finance & Money Coach

**Take control of your money. Build better financial habits.**

Vikasana is a full-stack personal finance application that helps users track income and expenses, manage savings goals, understand spending patterns, and make more informed financial decisions.

Built with React, TypeScript, FastAPI, and SQLite, Vikasana brings everyday money-management tools together in one application.

## Features

- **User Authentication** — Register and log in with token-based authentication.
- **Transaction Management** — Record and manage income and expenses.
- **Financial Dashboard** — Review financial activity and spending summaries.
- **Savings Goals** — Set targets and track savings progress.
- **Money Coach** — Get rule-based responses about budgeting, spending, saving, and cash flow.
- **CSV Export** — Export transaction data for personal analysis.
- **Reminders** — Keep track of financial tasks and goals.
- **Progressive Web App (PWA)** — Includes PWA configuration and app icons.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | CSS |
| Backend | Python, FastAPI |
| Database | SQLite, SQLAlchemy |
| Authentication | JWT |
| Package management | npm, pip |

## Project Structure

```text
vikasana/
├── backend/
│   ├── main.py
│   └── requirements.txt
├── public/
│   ├── icons.svg
│   ├── pwa-192x192.png
│   └── pwa-512x512.png
├── src/
│   ├── App.tsx
│   ├── App.css
│   ├── CoachChat.tsx
│   ├── CoachChat.css
│   ├── index.css
│   └── main.tsx
├── .gitignore
├── package.json
├── package-lock.json
├── vite.config.ts
└── README.md
```

## Getting Started

### Prerequisites

Install:

- Git
- Node.js and npm
- Python 3.10 or later

### 1. Clone the repository

```bash
git clone https://github.com/ashrita4343/vikasana.git
cd vikasana
```

### 2. Set up the backend

From the project root, create and activate a virtual environment.

**Windows PowerShell:**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

Configure the JWT signing secret using the environment variable expected by `backend/main.py`. Use a strong, private secret and never commit it to GitHub.

Start the backend:

```powershell
uvicorn backend.main:app --reload
```

The API should be available at:

- API: `http://127.0.0.1:8000`
- Interactive API documentation: `http://127.0.0.1:8000/docs`

### 3. Set up the frontend

Open a second terminal in the project root:

```powershell
npm install
```

Create a `.env` file in the project root containing:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the frontend:

```powershell
npm run dev
```

Open the local URL printed by Vite.

## How the Money Coach Works

Vikasana includes a **rule-based Money Coach** that responds to supported financial questions using implemented rules and available financial information. It is designed to help users better understand their spending and build budgeting and saving habits.

The current coach is rule-based; it does not rely on a generative AI API.

## Security and Privacy

- Never commit `.env` files, credentials, or local database files.
- Use a strong JWT signing secret.
- Verify that users can access only their own financial records.
- Use HTTPS and secure, persistent database storage for production deployments.
- Avoid entering real financial information into an unverified deployment.

## Future Improvements

- Expanded financial charts and spending analytics.
- Recurring transactions and budget alerts.
- Automated frontend and backend tests.
- Improved accessibility and mobile experience.
- Production deployment with persistent storage and backups.

## Author

**Ashrita D**

GitHub: [@ashrita4343](https://github.com/ashrita4343)

---

Vikasana is a personal finance project exploring full-stack development, financial data management, and accessible money-management tools.
