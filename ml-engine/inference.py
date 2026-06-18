"""Shared inference helpers — model loaded once, reused by CLI and HTTP server."""

from __future__ import annotations

from pathlib import Path

import joblib
import pandas as pd

from constants import FEATURE_COLS

MODEL_PATH = Path(__file__).parent / "models" / "at_bat_model.joblib"

_ARTIFACT: dict | None = None


def get_artifact() -> dict:
    global _ARTIFACT
    if _ARTIFACT is None:
        if not MODEL_PATH.exists():
            raise FileNotFoundError(
                f"Missing {MODEL_PATH}. Run `python 02_train_model.py` first."
            )
        _ARTIFACT = joblib.load(MODEL_PATH)
    return _ARTIFACT


def predict_outcome_probs(features: dict) -> dict[str, float]:
    """
    Return snake_case outcome probabilities summing to 1.0.

    `features` keys must match FEATURE_COLS in constants.py.
    """
    artifact = get_artifact()
    pipeline = artifact["pipeline"]
    outcome_keys = artifact["outcome_keys"]
    feature_cols = artifact["feature_cols"]

    row = pd.DataFrame([{col: features.get(col) for col in feature_cols}])
    probs = pipeline.predict_proba(row)[0]

    result = {key: float(probs[i]) for i, key in enumerate(outcome_keys)}
    total = sum(result.values())
    if total <= 0:
        raise ValueError("Model returned non-positive probability sum")
    return {key: value / total for key, value in result.items()}


def game_state_to_features(
    *,
    inning: int,
    balls: int,
    strikes: int,
    outs: int,
    on_first: bool,
    on_second: bool,
    on_third: bool,
    inning_half: str,
    pitch_count: int,
) -> dict:
    """Map ingestor GameState fields to model feature dict."""
    runners_code = int(on_first) * 1 + int(on_second) * 2 + int(on_third) * 4
    return {
        "inning": inning,
        "balls": balls,
        "strikes": strikes,
        "outs": outs,
        "on_first": int(on_first),
        "on_second": int(on_second),
        "on_third": int(on_third),
        "runners_code": runners_code,
        "half_inning_bottom": int(inning_half.lower() == "bottom"),
        "pitch_count_in_ab": pitch_count,
    }


def predict_from_game_state(state: dict) -> dict[str, float]:
    """Accept ingestor JSON body and return outcome probabilities."""
    features = game_state_to_features(
        inning=int(state.get("inning", 1)),
        balls=int(state.get("balls", 0)),
        strikes=int(state.get("strikes", 0)),
        outs=int(state.get("outs", 0)),
        on_first=bool(state.get("on_first", False)),
        on_second=bool(state.get("on_second", False)),
        on_third=bool(state.get("on_third", False)),
        inning_half=str(state.get("inning_half", "top")),
        pitch_count=int(state.get("pitch_count", 0)),
    )
    return predict_outcome_probs(features)
