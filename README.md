# Agentic FinTracker

A personal finance tracker with an AI-powered conversational assistant. Log income and expenses by chatting naturally, upload bank statement PDFs for automatic extraction, track savings goals with risk assessment, and visualize spending through an interactive dashboard.

![Python](https://img.shields.io/badge/Python-3.7+-blue) ![Flask](https://img.shields.io/badge/Flask-web_framework-lightgrey) ![OpenAI](https://img.shields.io/badge/OpenAI-API-green) ![SQLite](https://img.shields.io/badge/SQLite-database-orange)

---

## Features

- **AI Chat Assistant** — Converse naturally to log transactions, check balances, manage goals, and query spending history. Powered by OpenAI with function calling.
- **PDF Bank Statement Import** — Upload a PDF and the agent automatically extracts and categorizes transactions; you confirm before anything is saved.
- **Dashboard** — Monthly income vs. spending summary, balance change from last month, top spending categories, and recent transactions.
- **Transactions** — Unified view of all income and expenses, filterable by month.
- **Budget Analysis** — Spending breakdown by category with percentage visualization and daily trends.
- **Savings Goals** — Create goals with deadlines; an AI risk scorer compares your target against projected savings and flags unrealistic goals.
- **Multi-user** — Each account is fully isolated; sessions expire after 7 days.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Web framework | Flask + Jinja2 |
| AI agents | OpenAI API (GPT models) |
| PDF extraction | pdfplumber |
| Database | SQLite (thread-safe wrapper) |
| Auth | Werkzeug PBKDF2 password hashing |
| Frontend | Vanilla HTML / CSS / JavaScript + SSE streaming |
| Config | python-dotenv + YAML |

---

## Project Structure

```
Agentic FinTracker/
├── main.py                  # Flask entry point, all routes and API endpoints
├── requirements.txt
├── .env                          # Your API key (see Setup)
└── app/
    ├── config/
    │   ├── config.py             # Loads .env and config.YAML, exports settings
    │   └── config.YAML           # Model names, system prompts, file paths
    └── backend/
        ├── agents/
        │   ├── base_agent.py     # OpenAI client wrapper shared by all agents
        │   ├── chatbot.py        # Conversational agent with tool-calling loop
        │   ├── pdf_extractor.py  # Extracts transactions from bank statement PDFs
        │   └── goal_risk_scorer.py  # Scores goal feasibility from spending history
        ├── database/
        │   ├── db_manager.py     # Thread-safe SQLite wrapper
        │   └── tables_schema.sql # Schema: users, sessions, income, expenses, goals, chat
        └── tools/
            ├── db_tools.py       # Financial tools callable by the LLM
            └── tools.py          # Tool dispatcher / router
    └── frontend/
        ├── templates/            # Jinja2 HTML templates
        └── static/
            ├── css/              # Page-specific stylesheets
            └── js/               # Page-specific JavaScript
```

---

## Setup

### Prerequisites

- Python 3.7+
- An [OpenAI API key](https://platform.openai.com/api-keys)

### 1. Clone and create a virtual environment

```powershell
git clone <https://github.com/Chinthaka-Sharuna/Agentic-FinTracker.git>
cd "Agentic FinTracker"
python -m venv .venv

# On Windows:
.\.venv\Scripts\activate

# On macOS/Linux:
source .venv/bin/activate
```

### 2. Install dependencies

```powershell
pip install -r requirements.txt
```

### 3. Configure environment variables

Create a `.env` file in the project root:

```env
API_KEY=sk-proj-your-openai-api-key-here
```

### 4. Run the app

```powershell
python main.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000) in your browser, register an account, and start tracking.

---
# Deployment (Docker)

## 1. Configure Environment Variables

Create a `.env` file:

``` env
API_KEY=sk-proj-your-openai-api-key-here
```

## 2. Build and Start the Container

``` bash
docker compose up -d --build
```

The app will be available at:

-   http://localhost:5000

SQLite data and chat logs are persisted in the local `./data` volume.

### View Logs

``` bash
docker compose logs -f
```

### Stop the Container

``` bash
docker compose down
```

## Configuration

All model names, system prompts, and file paths are in [app/config/config.YAML](app/config/config.YAML). Key settings:

| Setting | Default | Description |
|---|---|---|
| `chatbot.model` | `gpt-5-nano` | Model used for the chat assistant |
| `pdf_extractor.model` | `gpt-4.1-mini` | Model used for PDF extraction |
| `paths.database` | `data/finance_tracker.db` | SQLite database location |

---

## API Reference

### Auth

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account |
| `POST` | `/api/auth/login` | Login, receive session token |
| `POST` | `/api/auth/logout` | Invalidate session |
| `GET` | `/api/auth/me` | Current user info |

### Chat

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/chat/stream` | Send message (+ optional PDF), returns SSE stream |
| `GET` | `/api/chat/history` | Last 50 messages |
| `DELETE` | `/api/chat/clear` | Clear in-memory conversation context |

### Data (all require auth)

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/dashboard` | Monthly summary, balance delta, top categories |
| `POST` | `/api/transactions` | All transactions, filterable by month |
| `POST` | `/api/budgets` | Spending by category with percentages |
| `POST` | `/api/goals` | List all goals |
| `POST` | `/api/goals/create` | Create goal (includes risk assessment) |
| `POST` | `/api/goals/update` | Update goal fields |
| `POST` | `/api/goals/delete` | Delete goal |

---

## Chat Tools

The AI assistant can invoke these tools during a conversation:

| Tool | What it does |
|---|---|
| `log_income` | Record salary, bonus, or other income |
| `log_expense` | Log a purchase with category and date |
| `get_balance` | Current month income / spent / remaining |
| `get_expense_summary` | Category breakdown for a date range |
| `get_goals` | List all goals with progress |
| `create_goal` | Create a new savings goal |
| `update_goal` | Modify title, amount, deadline, or notes |
| `add_money_to_goal` | Contribute to a goal (also logged as a savings expense) |

**Expense categories:** Food, Transport, Utilities, Rent, Healthcare, Shopping, Entertainment, Education, Insurance, Subscriptions, Fuel, Other

> **Note:** Goal contributions are intentionally logged as `savings` expenses. This reduces your visible remaining balance so you see less money available to spend, which encourages saving.

---

## Database Schema

| Table | Purpose |
|---|---|
| `users` | Accounts (username, email, password hash) |
| `sessions` | Login tokens with 7-day expiry |
| `income` | Income records (amount, description, date) |
| `expenses` | Expense records (amount, category, description, date) |
| `goals` | Savings goals (target, deadline, status, progress) |
| `goal_progress` | Links goal contributions to expense records |
| `chat_history` | Conversation messages per user |

---

## Development

- Add or change models and prompts in [app/config/config.YAML](app/config/config.YAML) - no code changes needed.
- Add new LLM-callable tools in [app/backend/tools/db_tools.py](app/backend/tools/db_tools.py) and register them in [app/backend/tools/tools.py](app/backend/tools/tools.py).
- After adding dependencies: `pip freeze > requirements.txt`

---

## Feature Enhancements

Planned improvements for future versions:

- **Goal progress history** - Record each contribution in the `goal_progress` table, linking goal contributions to their expense records for a full audit trail
- **Goal status computation** - Implement proper risk-based and progress-based logic in `_compute_goal_status()` (currently returns `on-track` as a placeholder)
- **User settings page** - Currency selection, date format, display preferences, and chatbot behaviour toggles
- **Currency support** - Apply user-selected currency across all endpoints and dashboard displays
- **Budget alerts** - Notify when monthly spending in a category exceeds a set threshold
- **Recurring transactions** - Auto-log repeating income and expenses (e.g. salary, subscriptions)
-**Mobile app with NFC support** - Tap-to-log expenses using NFC on supported devices

---

## License

This project is licensed under the MIT License - see the LICENSE file for details.