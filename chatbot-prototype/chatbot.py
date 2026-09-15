"""
Simple rule-based financial chatbot prototype.

Matches a fixed set of predefined queries to canned responses built from the
analyzed data in financial_data.py, using plain if/elif matching as
described in the task. Input matching is case-insensitive and ignores
surrounding whitespace so the chatbot is a bit more forgiving to type into.

Run interactively:
    python chatbot.py

Run the automated demo/tests:
    python chatbot.py --test
"""

import sys

from financial_data import (
    FINANCIAL_DATA,
    net_income_change,
    profit_margin_pct,
    revenue_growth_pct,
    top_expense_share_pct,
)

PREDEFINED_QUERIES = [
    "What is the total revenue?",
    "How has net income changed over the last year?",
    "What are the total expenses?",
    "What is the profit margin?",
    "What is the top expense category?",
]


def simple_chatbot(user_query):
    query = user_query.strip().lower()

    if query == "what is the total revenue?":
        return (
            f"The total revenue for {FINANCIAL_DATA['fiscal_year']} is "
            f"${FINANCIAL_DATA['total_revenue']:,} "
            f"(up {revenue_growth_pct():.1f}% from the prior year)."
        )

    elif query == "how has net income changed over the last year?":
        direction, amount, pct = net_income_change()
        return (
            f"Net income has {direction} by ${amount:,} ({pct:.1f}%) over the "
            f"last year, from ${FINANCIAL_DATA['prior_year_net_income']:,} to "
            f"${FINANCIAL_DATA['net_income']:,}."
        )

    elif query == "what are the total expenses?":
        return f"Total expenses for {FINANCIAL_DATA['fiscal_year']} are ${FINANCIAL_DATA['total_expenses']:,}."

    elif query == "what is the profit margin?":
        return f"The profit margin for {FINANCIAL_DATA['fiscal_year']} is {profit_margin_pct():.1f}%."

    elif query == "what is the top expense category?":
        return (
            f"The top expense category is {FINANCIAL_DATA['top_expense_category']} "
            f"at ${FINANCIAL_DATA['top_expense_amount']:,} "
            f"({top_expense_share_pct():.1f}% of total expenses)."
        )

    else:
        return "Sorry, I can only provide information on predefined queries."


def run_tests():
    """Runs each predefined query plus an unknown query and prints the results."""
    print("=== Chatbot test run ===\n")
    for query in PREDEFINED_QUERIES:
        print(f"Q: {query}")
        print(f"A: {simple_chatbot(query)}\n")

    unknown = "What is the weather today?"
    print(f"Q: {unknown}")
    print(f"A: {simple_chatbot(unknown)}\n")

    # Case-insensitivity check
    variant = PREDEFINED_QUERIES[0].upper()
    print(f"Q: {variant}  (case-insensitivity check)")
    print(f"A: {simple_chatbot(variant)}\n")

    print("=== Test run complete ===")


def run_interactive():
    print("Financial Chatbot Prototype")
    print("Ask one of the following predefined questions (or type 'quit' to exit):")
    for query in PREDEFINED_QUERIES:
        print(f"  - {query}")
    print()

    while True:
        user_query = input("You: ").strip()
        if user_query.lower() in ("quit", "exit"):
            print("Bot: Goodbye!")
            break
        print(f"Bot: {simple_chatbot(user_query)}")


if __name__ == "__main__":
    if "--test" in sys.argv:
        run_tests()
    else:
        run_interactive()
