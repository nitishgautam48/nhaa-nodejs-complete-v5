"""
Sample financial data used by the chatbot prototype.

NOTE: This repository does not contain a "Task 1" financial analysis, so the
figures below are illustrative sample data for a fictional company, "Acme
Robotics Inc.", covering fiscal years 2023 and 2024. Replace these values
with your own analyzed data from Task 1 when wiring this prototype into a
real project.
"""

FINANCIAL_DATA = {
    "company": "Acme Robotics Inc.",
    "fiscal_year": "FY2024",
    "total_revenue": 1_250_000,
    "prior_year_revenue": 1_050_000,
    "net_income": 185_000,
    "prior_year_net_income": 142_000,
    "total_expenses": 1_065_000,
    "top_expense_category": "Operations",
    "top_expense_amount": 420_000,
}


def revenue_growth_pct():
    return (
        (FINANCIAL_DATA["total_revenue"] - FINANCIAL_DATA["prior_year_revenue"])
        / FINANCIAL_DATA["prior_year_revenue"]
        * 100
    )


def net_income_change():
    change = FINANCIAL_DATA["net_income"] - FINANCIAL_DATA["prior_year_net_income"]
    direction = "increased" if change >= 0 else "decreased"
    pct = abs(change) / FINANCIAL_DATA["prior_year_net_income"] * 100
    return direction, abs(change), pct


def profit_margin_pct():
    return FINANCIAL_DATA["net_income"] / FINANCIAL_DATA["total_revenue"] * 100


def top_expense_share_pct():
    return FINANCIAL_DATA["top_expense_amount"] / FINANCIAL_DATA["total_expenses"] * 100
