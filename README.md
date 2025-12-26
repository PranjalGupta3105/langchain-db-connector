# langchain-db-connector

Connecting the database and querying via AI through LangChain

## Overview ✅
This project demonstrates how to connect to a PostgreSQL database, load recent expense rows, and use LangChain with an OpenAI model to answer structured questions about that data.

Key components:
- Database connection and query (PostgreSQL using `pg`) 🔌
- Data retrieval and basic validation (limits, joins) 📊
- Prompt → Model → Structured Output Parser pipeline using LangChain 🧠

---

## Features ✨
- Create and validate a PostgreSQL connection pool
- Retrieve the latest 200 non-deleted expenses with related payment metadata
- Build a LangChain pipeline (prompt -> model -> structured parser)
- Invoke the pipeline with a question and receive structured AI output

---

## Requirements 🔧
- Node.js (v20+ recommended)
- An OpenAI API key (set in `OPENAI_API_KEY`)
- A PostgreSQL database with a table named `expenses` and related `payment_sources` and `payment_methods`

---

## Environment variables
Set these in a `.env` file or in your environment before running the script:

- OPENAI_API_KEY — Your OpenAI API key
- PGHOST or DB_HOST — database host (default: `localhost`)
- PGPORT or DB_PORT — database port (default: `5432`)
- PGUSER or DB_USER — database username
- PGPASSWORD or DB_PWD — database password
- PGDATABASE or DB_NAME — database name
- PGSSLMODE (set to `require`) or PG_SSL (set to `true`) — enable SSL
- PGPOOL_MAX — connection pool max size (default: 10)
- PG_IDLE_TIMEOUT — idle timeout in ms (default: 30000)

Example `.env`:

```
OPENAI_API_KEY=sk-...
PGHOST=localhost
PGPORT=5432
PGUSER=myuser
PGPASSWORD=mypwd
PGDATABASE=mydb
PGSSLMODE=require
PGPOOL_MAX=10
PG_IDLE_TIMEOUT=30000
```

---

## Installation

```bash
npm install
# (the project uses `pg` and LangChain packages; `pg` is required for DB access)
```

---

## Usage ▶️
The main script `main.js` performs the following flow:
1. Connects to PostgreSQL and runs a query to fetch the last 200 expenses
2. Creates a `ChatOpenAI` model instance
3. Builds a prompt and a `StructuredOutputParser`
4. Calls the chain with a question and logs the structured response

Run it with:

```bash
node main.js
```

Notes:
- The current default model in `main.js` is `gpt-4.1` and the prompt asks for the total amount for expenses in November. Edit `main.js` to change the question or date range as needed.
- Be mindful of token / context limits if you expand the dataset or stream large contexts.

---

## Troubleshooting ⚠️
- SyntaxError: "Cannot use import statement outside a module" — Ensure `package.json` includes `"type": "module"` or use CommonJS `require`.
- DB connection issues — check credentials and SSL settings; the script runs a `SELECT 1` to validate the connection.
- OpenAI context length errors — reduce the dataset size or implement retrieval/aggregation strategies.

---

## License
MIT

