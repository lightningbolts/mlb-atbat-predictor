from pathlib import Path

import joblib
import pandas as pd

from constants import FEATURE_COLS

MODEL_PATH = Path(__file__).parent / "models" / "at_bat_model.joblib"


def load_model() -> dict:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Missing {MODEL_PATH}. Run `python 02_train_model.py` first."
        )
    return joblib.load(MODEL_PATH)


def predict_outcome_probs(features: dict) -> dict[str, float]:
    """
    Return snake_case outcome probabilities summing to 1.0.

    `features` keys must match FEATURE_COLS in constants.py.
    """
    artifact = load_model()
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


if __name__ == "__main__":
    scenarios = [
        ("3-0 count", {
            "inning": 5, "balls": 3, "strikes": 0, "outs": 1,
            "on_first": 1, "on_second": 0, "on_third": 0,
            "runners_code": 1, "half_inning_bottom": 1, "pitch_count_in_ab": 3,
        }),
        ("0-2 count", {
            "inning": 5, "balls": 0, "strikes": 2, "outs": 1,
            "on_first": 0, "on_second": 0, "on_third": 0,
            "runners_code": 0, "half_inning_bottom": 1, "pitch_count_in_ab": 3,
        }),
        ("3-2, runner on first", {
            "inning": 9, "balls": 3, "strikes": 2, "outs": 2,
            "on_first": 1, "on_second": 0, "on_third": 0,
            "runners_code": 1, "half_inning_bottom": 1, "pitch_count_in_ab": 7,
        }),
    ]

    for label, features in scenarios:
        probs = predict_outcome_probs(features)
        print(f"\n{label}:")
        for key in sorted(probs, key=probs.get, reverse=True):
            print(f"  {key}: {probs[key]:.3f}")
        print(f"  sum: {sum(probs.values()):.3f}")

    mapped = game_state_to_features(
        inning=7,
        balls=2,
        strikes=2,
        outs=1,
        on_first=True,
        on_second=False,
        on_third=False,
        inning_half="bottom",
        pitch_count=5,
    )
    assert set(mapped) == set(FEATURE_COLS)
    print("\ngame_state_to_features OK")
