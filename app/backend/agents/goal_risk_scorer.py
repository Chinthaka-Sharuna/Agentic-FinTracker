from .base_agent import BaseAgent


class GoalRiskScorer(BaseAgent):

    def __init__(self, api_key: str, base_url: str = "https://api.openai.com/v1",model: str = "gpt-5-nano", system_prompt: str = "You are a helpful assistant."):
        super().__init__(api_key=api_key, base_url=base_url, model=model)
        self.system_prompt = system_prompt

    def score_goal_risk(self, avg_income: float, avg_expenses: float,target: float, months_remaining: float) -> tuple:
        """
        Score the risk level of a given goal on a scale of 0 to 100.

        Returns:
            score       : int   — risk score 0-100 (higher = more risky)
            verdict     : str   — 'achievable' / 'risky' / 'not_feasible'
            message     : str   — human readable explanation
            possibility : bool  — True if goal is considered achievable
        """
        monthly_savings  = avg_income - avg_expenses
        projected        = monthly_savings * months_remaining

        if projected >= target:
            verdict  = "achievable"
            score    = 20
            message  = f"You're on track. Projected savings of ${projected:,.2f} covers your target of ${target:,.2f}."
        elif projected >= target * 0.75:
            verdict  = "risky"
            score    = 55
            shortfall = target - projected
            message  = f"This goal is risky. You may fall short by ${shortfall:,.2f}. Consider increasing monthly savings."
        else:
            verdict  = "not_feasible"
            score    = 85
            shortfall = target - projected
            message  = f"This goal is not feasible in the given timeframe. Projected shortfall is ${shortfall:,.2f}."

        possibility = score <= 60  # True if low or moderate risk

        return score, verdict, message, possibility