# Vikasana — Personal Finance & Money Coach

**Take control of your money. Build better financial habits.**

Vikasana is a full-stack personal finance application designed to help users track income and expenses, manage savings goals, understand spending patterns, and make more informed financial decisions.

It combines a React and TypeScript frontend with a FastAPI backend, providing a foundation for personal financial management in a clean, interactive interface.

## Features

- **User Authentication** — Register and log in with token-based authentication.
- **Transaction Management** — Record and manage income and expenses.
- **Financial Dashboard** — Review financial activity and spending summaries.
- **Savings Goals** — Set financial targets, track progress, and manage contributions.
- **Money Coach** — Get rule-based responses and insights about spending, budgeting, saving, cash flow, and other supported financial topics.
- **CSV Export** — Export transaction data for personal analysis.
- **Reminders** — Access reminders for financial tasks and goals.
- **Progressive Web App (PWA)** — Includes PWA configuration and app icons.

## Tech Stack

| Layer | Technologies |
|---|---|
| Frontend | React, TypeScript, Vite |
| Styling | CSS |
| Backend | Python, FastAPI |
| Database | SQLite, SQLAlchemy |
| Authentication | JWT-based authentication |
| Development | ESLint, npm |

## Project Structure

```text
Vikasana/
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

Install the following before running the project:

- Node.js and npm
- Python 3.10 or later
- Git

### 1. Clone the repository

```bash
git clone https://github.com/ashrita4343/vikasana-ai-financial-coach.git
cd vikasana-ai-financial-coach
```

### 2. Set up the backend

From the project root, create and activate a Python virtual environment.

**Windows PowerShell:**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r backend/requirements.txt
```

Start the FastAPI development server:

```powershell
uvicorn backend.main:app --reload
```

The API will typically be available at `http://127.0.0.1:8000`.

Explore the interactive API documentation at `http://127.0.0.1:8000/docs`.

### 3. Set up the frontend

Open a second terminal in the project root and install the dependencies:

```bash
npm install
```

Create a local `.env` file in the project root with the backend URL:

```env
VITE_API_URL=http://127.0.0.1:8000
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite in your terminal.

> **Note:** Configure the JWT signing secret using the environment variable expected by the backend. Never commit secrets or your local database to GitHub. Verify the backend's expected environment variables before deployment.

## How the Money Coach Works

Vikasana includes a rule-based Money Coach that interprets supported questions and provides responses based on its implemented rules and available financial information.

It is designed to make financial information easier to understand and encourage better budgeting and saving habits. It should not be treated as a substitute for professional financial advice.

## Security and Privacy

- Keep environment variables and credentials out of version control.
- Use a strong, private JWT signing secret.
- Test authentication and ensure users can access only their own financial records.
- Use HTTPS and an appropriately secured, persistent database when deploying.
- Avoid entering real financial information into an unverified deployment.

## Future Improvements

Potential improvements include:

- More detailed spending analytics and visualizations.
- Recurring transaction support.
- Budget limits and category-based alerts.
- Enhanced accessibility and mobile experience.
- Automated backend and frontend tests.
- Secure production deployment with database backups.

## Author

**Ashrita D**

GitHub: [@ashrita4343](https://github.com/ashrita4343)

---

*Vikasana is a personal finance project built to explore full-stack development, financial data management, and accessible money-management tools.*
