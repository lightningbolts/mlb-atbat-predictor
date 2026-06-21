"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import { AppNav } from "@/components/features/AppNav";
import { BatterRispRecord } from "@/components/features/BatterRispRecord";
import { BatterVsPitcherRecord } from "@/components/features/BatterVsPitcherRecord";
import { BoxScoreView } from "@/components/features/BoxScoreView";
import { DashboardSkeleton } from "@/components/features/DashboardSkeleton";
import { DueUpDialog } from "@/components/features/DueUpDialog";
import { GameDetailTabs, type GameDetailTab } from "@/components/features/GameDetailTabs";
import { GameHitsView } from "@/components/features/GameHitsView";
import { GameFinalDialog } from "@/components/features/GameFinalDialog";
import { PitchSequence } from "@/components/features/PitchSequence";
import { PlayByPlay } from "@/components/features/PlayByPlay";
import { ProbabilityChart } from "@/components/features/ProbabilityChart";
import { Scorebug } from "@/components/features/Scorebug";
import { Skeleton } from "@/components/ui/Skeleton";
import { useGameBoxScore } from "@/hooks/useGameBoxScore";
import { useGamePredictions } from "@/hooks/useGamePredictions";
import { useLiveGameState } from "@/hooks/useLiveGameState";
import { useGameState } from "@/hooks/useGameState";
import { useArchiveFinishedGame } from "@/hooks/useArchiveFinishedGame";
import { useBatterRisp } from "@/hooks/useBatterRisp";
import { useBatterVsPitcher } from "@/hooks/useBatterVsPitcher";
import { useBreakLinger } from "@/hooks/useBreakLinger";
import { useLiveGameOverlays } from "@/hooks/useLiveGameOverlays";
import { formatGameDate, formatMatchup, formatScore, isLiveStatus } from "@/lib/games/format";
import { buildSeasonHistoryHref } from "@/lib/mlb/schedule";
import { gameStateForAtBat } from "@/lib/games/replay";
import { isHalfInningBreak } from "@/lib/mlb/lineup";
import { isPlayByPlayAtBat } from "@/lib/mlb/liveFeed";
import { cn } from "@/lib/utils";
import { DEFAULT_OUTCOME_PROBABILITIES } from "@/types/database";
import type { Game } from "@/types/database";
import type { PlayByPlayEntry } from "@/types/mlb-live";

interface HistoricalGameDashboardProps {
  game: Game;
  historyBack?: {
    date?: string;
    view?: "date" | "team";
    teamId?: number | null;
  };
}

function Panel({
  title,
  children,
  className,
  flushMobile,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
  flushMobile?: boolean;
}) {
  return (
    <section
      className={cn(
        "flex min-w-0 flex-col overflow-hidden bg-panel md:min-h-[220px] lg:min-h-0",
        flushMobile ? "min-h-0 p-0 md:min-h-[280px] md:p-3" : "min-h-[280px] p-3",
        className,
      )}
    >
      <h3
        className={cn(
          "shrink-0 text-xs font-medium text-muted",
          flushMobile ? "hidden md:mb-2 md:block" : "mb-2",
        )}
      >
        {title}
      </h3>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden">{children}</div>
    </section>
  );
}

export function HistoricalGameDashboard({ game, historyBack }: HistoricalGameDashboardProps) {
  const isLive = isLiveStatus(game.status);
  const [activeTab, setActiveTab] = useState<GameDetailTab>("plays");

  const {
    gameState: liveGameState,
    isLoading: liveLoading,
    error: liveError,
  } = useLiveGameState(game.game_pk, {
    enabled: isLive,
    pollBurstKey: activeTab,
  });
  const {
    gameState: archivedGameState,
    isLoading: archivedLoading,
    error: archivedError,
    source,
    feedSyncedAt,
  } = useGameState(game.game_pk, { enabled: !isLive });
  const gameState = isLive ? liveGameState : archivedGameState;
  const isLoading = isLive ? liveLoading : archivedLoading;
  const error = isLive ? liveError : archivedError;

  const {
    boxScore,
    isLoading: isBoxScoreLoading,
    error: boxScoreError,
  } = useGameBoxScore(game.game_pk, { poll: isLive, pollBurstKey: activeTab });

  const { showBreakUI } = useBreakLinger(isLive ? gameState : null);
  const { dueUp, showDueUp, dismissDueUp, showFinal, dismissFinal, gameOver } = useLiveGameOverlays(
    isLive ? gameState : null,
    isLive ? boxScore : null,
    showBreakUI,
  );
  useArchiveFinishedGame(game.game_pk, isLive && gameOver);

  const [selectedAtBatIndex, setSelectedAtBatIndex] = useState<number | null>(null);

  const atBatPlays = useMemo(
    () => gameState?.plays.filter(isPlayByPlayAtBat) ?? [],
    [gameState],
  );

  useEffect(() => {
    if (!atBatPlays.length) return;
    setSelectedAtBatIndex((current) => {
      if (current != null && atBatPlays.some((play) => play.atBatIndex === current)) {
        return current;
      }
      return atBatPlays[atBatPlays.length - 1]?.atBatIndex ?? null;
    });
  }, [atBatPlays]);

  const selectedPlay = useMemo<PlayByPlayEntry | null>(() => {
    if (!gameState || selectedAtBatIndex == null) return null;
    const play = gameState.plays.find((p) => p.atBatIndex === selectedAtBatIndex);
    if (!play || !isPlayByPlayAtBat(play)) return null;
    return play;
  }, [gameState, selectedAtBatIndex]);

  const displayState = useMemo(() => {
    if (!gameState) return null;
    if (!selectedPlay) return gameState;
    return gameStateForAtBat(gameState, selectedPlay);
  }, [gameState, selectedPlay]);

  const onFirst = displayState?.onFirst ?? false;
  const onSecond = displayState?.onSecond ?? false;
  const onThird = displayState?.onThird ?? false;
  const runnersInScoringPosition = onSecond || onThird;

  const lastPitch = selectedPlay?.detail.pitches.at(-1);
  const { predictionForAtBat, predictions, isLoading: predictionsLoading } = useGamePredictions(
    game.game_pk,
    selectedPlay
      ? {
          batterName: selectedPlay.batterName,
          inning: selectedPlay.inning,
          balls: lastPitch?.balls ?? 0,
          strikes: lastPitch?.strikes ?? 0,
        }
      : null,
  );

  const probabilities =
    predictionForAtBat?.outcome_probabilities ?? DEFAULT_OUTCOME_PROBABILITIES;

  const { record: matchupRecord, isLoading: isMatchupLoading } = useBatterVsPitcher(
    displayState?.batterId,
    displayState?.pitcherId,
  );
  const { stats: rispStats, isLoading: isRispLoading } = useBatterRisp(
    displayState?.batterId,
    runnersInScoringPosition,
  );

  const score = formatScore(game);
  const seasonHistoryHref = buildSeasonHistoryHref({
    date: historyBack?.date ?? game.game_date,
    view: historyBack?.view ?? "date",
    teamId: historyBack?.teamId,
  });
  const showBatterHighlights =
    isLive &&
    gameState != null &&
    gameState.gameStatus === "Live" &&
    !isHalfInningBreak(gameState.inningState);

  return (
    <div className="flex h-screen min-h-0 flex-col overflow-x-hidden bg-background text-foreground">
      <AppNav />

      <div className="border-b border-border bg-surface px-3 py-3 sm:px-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <Link
              href={seasonHistoryHref}
              className="text-xs text-muted transition-colors hover:text-secondary"
            >
              ← Season history
            </Link>
            <h1 className="mt-1 text-lg font-medium text-foreground">{formatMatchup(game)}</h1>
            <p className="mt-0.5 text-sm text-muted">
              {formatGameDate(game.game_date)}
              {game.venue_name ? ` · ${game.venue_name}` : ""}
              {score ? ` · Final ${score}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-xs text-subtle sm:text-right">
            {feedSyncedAt ? (
              <span>Feed synced {new Date(feedSyncedAt).toLocaleString()}</span>
            ) : source === "mlb" ? (
              <span>Loaded from MLB API</span>
            ) : (
              <span>{game.feed_synced_at ? "Feed available" : "Run sync-game-feeds to cache in Supabase"}</span>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="border-b border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {isLoading && !gameState && activeTab === "plays" ? (
        <div className="flex flex-1 flex-col p-4">
          <Skeleton className="mb-4 h-14 w-full" />
          <DashboardSkeleton />
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <GameDetailTabs activeTab={activeTab} onTabChange={setActiveTab} />

          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden",
              activeTab !== "box" && "hidden",
            )}
            aria-hidden={activeTab !== "box"}
          >
            <BoxScoreView
              boxScore={boxScore}
              isLoading={isBoxScoreLoading}
              error={boxScoreError}
              atBatPlayerId={showBatterHighlights ? gameState?.batterId : null}
              onDeckPlayerId={showBatterHighlights ? gameState?.onDeckId : null}
              offenseTeamId={showBatterHighlights ? gameState?.offenseTeamId : null}
            />
          </div>

          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden",
              activeTab !== "spray" && "hidden",
            )}
            aria-hidden={activeTab !== "spray"}
          >
            <GameHitsView
              plays={gameState?.plays ?? []}
              venueId={gameState?.venueId ?? game.venue_id}
              venueName={gameState?.venueName ?? game.venue_name}
              awayAbbrev={gameState?.awayAbbrev ?? game.away_team_abbrev}
              homeAbbrev={gameState?.homeAbbrev ?? game.home_team_abbrev}
              isLoading={isLoading && !gameState}
            />
          </div>

          <div
            className={cn(
              "flex min-h-0 flex-1 flex-col overflow-hidden",
              activeTab !== "plays" && "hidden",
            )}
            aria-hidden={activeTab !== "plays"}
          >
          {!gameState ? (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <div>
                <p className="text-sm text-secondary">No play-by-play data for this game.</p>
                <p className="mt-2 text-xs text-subtle">
                  Run <code className="text-secondary">npm run sync-game-feeds</code> to backfill feeds, or switch to the Box tab.
                </p>
              </div>
            </div>
          ) : (
            <>
          <Scorebug gameState={displayState} />

          <div className="flex min-h-0 flex-1 overflow-x-hidden">
            <div className="hidden w-[300px] shrink-0 border-r border-border md:flex lg:w-[320px]">
              <PlayByPlay
                plays={gameState.plays}
                awayAbbrev={gameState.awayAbbrev}
                homeAbbrev={gameState.homeAbbrev}
                venueId={gameState.venueId}
                selectedAtBatIndex={selectedAtBatIndex}
                onSelectAtBat={(play) => setSelectedAtBatIndex(play.atBatIndex)}
                autoScrollToLatest={false}
                className="w-full"
              />
            </div>

            <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden">
              <div className="flex min-h-0 flex-1 flex-col gap-px overflow-x-hidden bg-border">
                <Panel
                  title="Selected at-bat"
                  flushMobile
                  className="order-1 shrink-0 overflow-hidden md:order-none md:min-h-[380px] md:flex-[3]"
                >
                  {displayState && (
                    <div className="hidden md:block">
                      <BatterVsPitcherRecord
                        batterName={displayState.batterName}
                        pitcherName={displayState.pitcherName}
                        record={matchupRecord}
                        isLoading={isMatchupLoading}
                      />
                      {runnersInScoringPosition && (
                        <BatterRispRecord
                          batterName={displayState.batterName}
                          stats={rispStats}
                          isLoading={isRispLoading}
                        />
                      )}
                    </div>
                  )}
                  {(displayState?.atBatPitches.length ?? 0) === 0 ? (
                    <div className="shrink-0 md:hidden">
                      <PitchSequence pitches={[]} layout="zone" zoneFirst />
                    </div>
                  ) : (
                    <>
                      <div className="shrink-0 md:hidden">
                        <PitchSequence
                          pitches={displayState?.atBatPitches ?? []}
                          layout="zone"
                          zoneFirst
                        />
                      </div>
                      <div className="hidden min-h-0 flex-1 md:flex">
                        <PitchSequence
                          pitches={displayState?.atBatPitches ?? []}
                          size="large"
                          layout="split"
                          contained
                          className="min-h-0 flex-1"
                        />
                      </div>
                    </>
                  )}
                  {(displayState?.atBatPitches.length ?? 0) === 0 && (
                    <p className="hidden text-sm text-subtle md:block">No pitch data for this at-bat.</p>
                  )}
                </Panel>

                <Panel
                  title="Outcome odds"
                  className="order-2 hidden min-h-[140px] shrink-0 md:order-none md:flex lg:flex-1"
                >
                  <div className="flex min-h-0 flex-1 flex-col">
                    {predictionForAtBat ? (
                      <ProbabilityChart
                        probabilities={probabilities}
                        contained
                        className="min-h-0 flex-1"
                      />
                    ) : predictionsLoading ? (
                      <p className="py-4 text-center text-sm text-muted">Loading predictions…</p>
                    ) : predictions.length > 0 ? (
                      <p className="py-4 text-center text-sm text-muted">
                        No model snapshot matched this exact at-bat count.
                      </p>
                    ) : (
                      <p className="py-4 text-center text-sm text-muted">
                        {isLive
                          ? "Waiting on ingestor for live predictions."
                          : "No ingestor predictions were stored for this game."}
                      </p>
                    )}
                  </div>
                </Panel>

                <div className="order-2 flex min-h-0 flex-1 flex-col md:hidden">
                  <PlayByPlay
                    plays={gameState.plays}
                    awayAbbrev={gameState.awayAbbrev}
                    homeAbbrev={gameState.homeAbbrev}
                    venueId={gameState.venueId}
                    selectedAtBatIndex={selectedAtBatIndex}
                    onSelectAtBat={(play) => setSelectedAtBatIndex(play.atBatIndex)}
                    autoScrollToLatest={false}
                    variant="feed"
                    animateEntrance={false}
                    className="min-h-0 flex-1"
                    embedPitchesAtBatIndex={selectedAtBatIndex}
                    feedHeader={
                      predictionForAtBat ? (
                        <ProbabilityChart probabilities={probabilities} compact />
                      ) : predictionsLoading ? (
                        <p className="py-2 text-center text-sm text-muted">Loading predictions…</p>
                      ) : predictions.length > 0 ? (
                        <p className="py-2 text-center text-sm text-muted">
                          No model snapshot matched this exact at-bat count.
                        </p>
                      ) : (
                        <p className="py-2 text-center text-sm text-muted">
                          {isLive
                            ? "Waiting on ingestor for live predictions."
                            : "No ingestor predictions were stored for this game."}
                        </p>
                      )
                    }
                  />
                </div>
              </div>
            </main>
          </div>
            </>
          )}
          </div>
        </div>
      )}

      {isLive && (
        <>
          <DueUpDialog context={dueUp} open={showDueUp} onClose={dismissDueUp} />
          <GameFinalDialog
            gameState={gameState}
            boxScore={boxScore}
            open={showFinal}
            onClose={dismissFinal}
          />
        </>
      )}
    </div>
  );
}
