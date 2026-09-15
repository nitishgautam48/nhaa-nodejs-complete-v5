# Financial Chatbot Prototype

A simple rule-based chatbot that answers a fixed set of predefined financial
questions using canned responses generated from analyzed financial data.

## Files

- `financial_data.py` — the analyzed financial data (sample data for a
  fictional company, "Acme Robotics Inc.", FY2024 vs. FY2023) and a few small
  helper calculations (growth %, profit margin %, etc.) used to build the
  chatbot's responses.
- `chatbot.py` — the chatbot itself. Contains `simple_chatbot(user_query)`,
  which matches user input against the predefined queries using if/elif
  statements and returns the matching canned response.
- `test_results.txt` — captured output from running the automated test mode
  (`python chatbot.py --test`).

## How it works

1. `financial_data.py` holds the source-of-truth numbers (total revenue, net
   income for the current and prior year, total expenses, top expense
   category) plus a few derived metrics computed at import time.
2. `chatbot.py` normalizes the user's input (trims whitespace, lowercases it)
   and compares it against the five predefined questions below. On a match,
   it returns a response string built from the data in `financial_data.py`.
   Any input that doesn't match falls through to a default "I can only
   answer predefined queries" response.
3. The script can run two ways:
   - **Interactive mode** (`python chatbot.py`): a command-line loop using
     `input()` where you type a question and get a reply, until you type
     `quit`.
   - **Test mode** (`python chatbot.py --test`): runs all predefined
     queries plus an unrecognized query and a case-variant query, and prints
     the results — this is what produced `test_results.txt`.

## Predefined queries the chatbot can answer

1. "What is the total revenue?"
2. "How has net income changed over the last year?"
3. "What are the total expenses?"
4. "What is the profit margin?"
5. "What is the top expense category?"

## Running it

Requires Python 3 only (no external libraries needed for the chatbot logic
itself; `pandas`/`Flask` were not necessary for this scope, since the data
set is small and the interface is a command-line prompt).

```bash
python chatbot.py          # interactive mode
python chatbot.py --test   # run the automated demo/tests
```

## Test summary

All 5 predefined queries were tested and returned the correct canned
response. Two additional checks were run:
- An unrecognized query ("What is the weather today?") correctly returned
  the fallback "Sorry, I can only provide information on predefined
  queries." message.
- An uppercase variant of a predefined query was correctly recognized
  thanks to case-insensitive matching.

See `test_results.txt` for the full captured output.

## Limitations

- **Exact-match only (after normalization).** The chatbot only recognizes
  the five predefined questions (case/whitespace-insensitive). It does not
  understand paraphrases, typos, synonyms, or partial matches — e.g. "what's
  the revenue?" will not match "What is the total revenue?". A production
  version would need NLP-based intent matching (e.g. keyword scoring, fuzzy
  matching, or an embeddings-based model) to be robust to phrasing.
- **Static, hard-coded data.** Figures live in `financial_data.py` and must
  be updated manually; the chatbot does not read from a live database, API,
  or spreadsheet.
- **Sample data, not real Task 1 output.** This repository did not contain
  an existing Task 1 financial analysis, so the figures used here are
  illustrative sample data. Swap in your real analyzed numbers in
  `financial_data.py` before using this for an actual report.
- **No conversation memory.** Each query is handled independently; the
  chatbot cannot answer follow-up questions like "and what about the year
  before that?".
- **No web interface.** This prototype is command-line only. A Flask-based
  web UI was intentionally left out to keep the prototype scoped to the
  task's time constraints, but `simple_chatbot()` is already structured so
  it could be dropped directly into a Flask route (e.g.
  `request.form["query"]` → `simple_chatbot(...)` → JSON/HTML response).
