from constants import FEATURE_COLS
from inference import game_state_to_features, predict_outcome_probs

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
