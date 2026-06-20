import { fetchMLBLiveFeed, type LiveFeedSnapshot } from "@/lib/mlb/liveFeed";
import type {
  MlbFeedWorkerPayload,
  MlbFeedWorkerRequest,
  MlbFeedWorkerResponse,
} from "@/types/mlb-feed-worker";
import type { AllPlayRaw, MLBLiveFeedResponse } from "@/types/mlb-live";

export type { MlbFeedWorkerPayload as LiveFeedPollResult };

let worker: Worker | null = null;
let nextRequestId = 0;
const pending = new Map<
  number,
  { resolve: (value: MlbFeedWorkerPayload) => void; reject: (reason: Error) => void }
>();

function getWorker(): Worker | null {
  if (typeof window === "undefined" || typeof Worker === "undefined") {
    return null;
  }

  if (!worker) {
    worker = new Worker(new URL("../../workers/mlb-feed.worker.ts", import.meta.url));
    worker.onmessage = (event: MessageEvent<MlbFeedWorkerResponse>) => {
      const data = event.data;
      const requestId = data.ok ? data.payload.requestId : data.requestId;
      const entry = pending.get(requestId);
      if (!entry) return;
      pending.delete(requestId);

      if (data.ok) {
        entry.resolve(data.payload);
      } else {
        entry.reject(new Error(data.error));
      }
    };
    worker.onerror = () => {
      for (const [, entry] of pending) {
        entry.reject(new Error("MLB feed worker error"));
      }
      pending.clear();
      worker?.terminate();
      worker = null;
    };
  }

  return worker;
}

function pollViaWorker(
  gamePk: number,
  playsFrom: number | null,
): Promise<MlbFeedWorkerPayload> {
  const instance = getWorker();
  if (!instance) {
    return pollOnMainThread(gamePk, playsFrom);
  }

  const requestId = ++nextRequestId;
  const request: MlbFeedWorkerRequest = { requestId, gamePk, playsFrom };

  return new Promise((resolve, reject) => {
    pending.set(requestId, { resolve, reject });
    instance.postMessage(request);
  });
}

function mergeCurrentPlayTail(
  allPlays: AllPlayRaw[],
  currentPlay: AllPlayRaw | null | undefined,
  from: number,
): AllPlayRaw[] {
  const tail = allPlays.slice(from);
  if (!currentPlay || allPlays.length === 0) return tail;

  const ongoingIndex = allPlays.length - 1;
  if (from > ongoingIndex) return tail;

  if (tail.length === 0) return [currentPlay];
  if (from + tail.length - 1 === ongoingIndex) {
    return [...tail.slice(0, -1), currentPlay];
  }

  return tail;
}

async function pollOnMainThread(
  gamePk: number,
  playsFrom: number | null,
): Promise<MlbFeedWorkerPayload> {
  const feed = await fetchMLBLiveFeed(gamePk);
  return payloadFromFeed(gamePk, feed, playsFrom);
}

function feedTimeStamp(feed: MLBLiveFeedResponse): string | null {
  const meta = (feed as MLBLiveFeedResponse & { metaData?: { timeStamp?: string } }).metaData;
  return meta?.timeStamp ?? null;
}

function payloadFromFeed(
  gamePk: number,
  feed: MLBLiveFeedResponse,
  playsFrom: number | null,
): MlbFeedWorkerPayload {
  const teams = feed.gameData.teams;
  const allPlays = feed.liveData.plays.allPlays ?? [];
  const currentPlay = feed.liveData.plays.currentPlay as AllPlayRaw | undefined;
  const payload: MlbFeedWorkerPayload = {
    requestId: 0,
    gamePk,
    gameStatus: feed.gameData.status.abstractGameState,
    awayTeam: teams.away.name,
    homeTeam: teams.home.name,
    awayAbbrev: teams.away.abbreviation ?? teams.away.name.slice(0, 3).toUpperCase(),
    homeAbbrev: teams.home.abbreviation ?? teams.home.name.slice(0, 3).toUpperCase(),
    venueId: feed.gameData.venue?.id ?? null,
    venueName: feed.gameData.venue?.name ?? null,
    linescore: feed.liveData.linescore,
    currentPlay,
    allPlaysCount: allPlays.length,
    feedTimeStamp: feedTimeStamp(feed),
  };

  if (playsFrom != null && playsFrom >= 0 && playsFrom <= allPlays.length) {
    const newPlays = mergeCurrentPlayTail(allPlays, currentPlay, playsFrom);
    if (newPlays.length > 0) {
      payload.playsFrom = playsFrom;
      payload.newPlays = newPlays;
    }
  }

  return payload;
}

/** Poll MLB live feed; pitch polls pass playsFrom=null to skip shipping allPlays. */
export function pollLiveFeed(
  gamePk: number,
  playsFrom: number | null,
): Promise<MlbFeedWorkerPayload> {
  return pollViaWorker(gamePk, playsFrom);
}

export function workerPayloadToSnapshot(payload: MlbFeedWorkerPayload): LiveFeedSnapshot {
  return {
    gamePk: payload.gamePk,
    gameStatus: payload.gameStatus,
    awayTeam: payload.awayTeam,
    homeTeam: payload.homeTeam,
    awayAbbrev: payload.awayAbbrev,
    homeAbbrev: payload.homeAbbrev,
    venueId: payload.venueId,
    venueName: payload.venueName,
    linescore: payload.linescore as LiveFeedSnapshot["linescore"],
    currentPlay: payload.currentPlay as LiveFeedSnapshot["currentPlay"],
    allPlaysCount: payload.allPlaysCount,
  };
}
