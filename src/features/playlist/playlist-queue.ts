/**
 * Which video of a my-list is playing back-to-back. Every move into "playing" gets a new
 * `playId`, so the player reloads even when the index stays the same (a single looping video,
 * ⏮ on the first video).
 */
export type PlaylistState = { status: "idle" } | { status: "playing"; index: number; playId: number };

export type PlaylistAction =
  | { type: "start"; index: number }
  | { type: "next" }
  | { type: "previous" }
  | { type: "ended" }
  | { type: "stop" };

export type PlaylistContext = { length: number; loop: boolean };

export const IDLE: PlaylistState = { status: "idle" };

function playAt(state: PlaylistState, index: number): PlaylistState {
  const playId = state.status === "playing" ? state.playId + 1 : 1;
  return { status: "playing", index, playId };
}

export function playlistReducer(state: PlaylistState, action: PlaylistAction, ctx: PlaylistContext): PlaylistState {
  if (action.type === "stop") {
    return IDLE;
  }

  if (action.type === "start") {
    const inRange = Number.isInteger(action.index) && action.index >= 0 && action.index < ctx.length;
    return inRange ? playAt(state, action.index) : IDLE;
  }

  if (state.status === "idle") {
    return IDLE;
  }

  if (action.type === "previous") {
    return playAt(state, Math.max(0, state.index - 1));
  }

  // "next" and "ended" both advance; past the end either loops or stops.
  const nextIndex = state.index + 1;
  if (nextIndex < ctx.length) {
    return playAt(state, nextIndex);
  }
  return ctx.loop && ctx.length > 0 ? playAt(state, 0) : IDLE;
}
