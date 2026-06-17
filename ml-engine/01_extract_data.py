import os
import pandas as pd
from dotenv import load_dotenv
from supabase import create_client, Client

# Load Environment Variables
load_dotenv()
url: str = os.environ.get("NEXT_PUBLIC_SUPABASE_URL") or os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

if not url or not key:
    raise ValueError(
        "Missing Supabase credentials. Set NEXT_PUBLIC_SUPABASE_URL and "
        "SUPABASE_SERVICE_ROLE_KEY in ml-engine/.env"
    )

supabase: Client = create_client(url, key)

OUTCOME_KEYS = [
    'strikeout',
    'walk',
    'single',
    'double',
    'triple',
    'home_run',
    'field_out',
    'force_out',
    'forceout',
    'grounded_into_dp',
    'fly_out',
    'flyout',
    'line_out',
    'lineout',
    'pop_out',
    'groundout',
    'sac_fly',
    'sacrifice_fly',
    'sac_bunt',
    'sacrifice_bunt',
    'bunt_groundout',
    'double_play',
    'fielders_choice_out',
    'fielders_choice',
    'field_error',
    'other',
]

def map_outcome(event_type):
    """Maps MLB at-bat result strings to our 4 target categories."""
    if not event_type:
        return 'Other'

    normalized = event_type.lower().replace(' ', '_').replace('-', '_')

    if normalized in ['strikeout', 'strikeout_double_play']:
        return 'Strikeout'
    elif normalized in ['walk', 'intentional_walk', 'intent_walk', 'hit_by_pitch']:
        return 'Walk'
    elif normalized in ['single', 'double', 'triple', 'home_run']:
        return 'Hit'
    elif normalized in [
        'field_out', 'force_out', 'forceout', 'grounded_into_dp',
        'fly_out', 'flyout', 'line_out', 'lineout', 'pop_out',
        'groundout', 'sac_fly', 'sacrifice_fly', 'sac_bunt',
        'sacrifice_bunt', 'bunt_groundout', 'double_play',
        'fielders_choice_out', 'fielders_choice', 'field_error',
    ]:
        return 'Out_In_Play'

    return 'Other'

def extract_at_bats_from_state(game_pk, state):
    """Flatten parsed LiveGameState JSON (stored by sync-game-feeds) into rows."""
    rows = []

    for play in state.get('plays', []):
        detail = play.get('detail') or {}
        pitcher_id = detail.get('pitcherId')
        batter_id = play.get('batterId') or detail.get('batterId')
        inning = play.get('inning') or detail.get('inning')

        pitches = [p for p in detail.get('pitches', []) if p.get('isPitch')]
        if not pitches:
            continue

        last_pitch = pitches[-1]
        situation = play.get('situationBefore') or {}

        rows.append({
            'game_pk': game_pk,
            'pitcher_id': pitcher_id,
            'batter_id': batter_id,
            'inning': inning,
            'balls': last_pitch.get('balls', 0),
            'strikes': last_pitch.get('strikes', 0),
            'outs': situation.get('outs', 0),
            'outcome_label': map_outcome(play.get('event') or detail.get('event')),
        })

    return rows

def fetch_ml_data():
    print("Fetching game JSONs from Supabase...")
    
    # Query the games table where we successfully synced the game_state JSON
    # Grabbing 100 games to start.
    response = supabase.table("games").select("game_pk, game_state").not_.is_("game_state", "null").limit(100).execute()
    
    print(f"Retrieved {len(response.data)} games. Flattening JSON into pitches...")
    
    all_pitches = []
    
    # Loop through every game
    for game in response.data:
        game_pk = game['game_pk']
        state = game['game_state']
        
        try:
            all_pitches.extend(extract_at_bats_from_state(game_pk, state))
        except Exception as e:
            print(f"Skipping game {game_pk} due to parsing error: {e}")
            continue

    if not all_pitches:
        print("No at-bats parsed from game_state.plays.")
        empty = pd.DataFrame(columns=[
            'game_pk', 'pitcher_id', 'batter_id', 'inning',
            'balls', 'strikes', 'outs', 'outcome_label',
        ])
        return empty[['inning', 'outs', 'balls', 'strikes']], empty['outcome_label'], empty

    # Convert the flat list of dictionaries into a Pandas DataFrame
    df = pd.DataFrame(all_pitches)
    
    # Clean the Data — one row per completed at-bat
    df = df[df['outcome_label'] != 'Other']
    df = df.dropna()
    
    print(f"Successfully flattened and cleaned {len(df)} at-bat outcomes!")
    
    # Split into Features (X) and Target (Y)
    features = ['inning', 'outs', 'balls', 'strikes']
    X = df[features]
    Y = df['outcome_label']
    
    return X, Y, df

if __name__ == "__main__":
    X, Y, raw_df = fetch_ml_data()
    
    if len(raw_df) > 0:
        print("\nFeature Matrix (X) Sample:")
        print(X.head())
        
        print("\nTarget Outcomes (Y) Distribution:")
        print(Y.value_counts(normalize=True))
    else:
        print("No valid at-bats found. Check JSON key paths.")