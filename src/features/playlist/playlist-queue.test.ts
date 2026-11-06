import { describe, expect, test } from "vitest";

import { IDLE, playlistReducer, type PlaylistState } from "./playlist-queue";

const three = { length: 3, loop: false };
const threeLoop = { length: 3, loop: true };

function playing(index: number, playId: number): PlaylistState {
  return { status: "playing", index, playId };
}

describe("playlistReducer", () => {
  test("start from idle plays the given index with playId 1", () => {
    expect(playlistReducer(IDLE, { type: "start", index: 0 }, three)).toEqual(playing(0, 1));
  });

  test("start while playing jumps and bumps playId", () => {
    expect(playlistReducer(playing(0, 4), { type: "start", index: 2 }, three)).toEqual(playing(2, 5));
  });

  test("next moves to the following video", () => {
    expect(playlistReducer(playing(0, 1), { type: "next" }, three)).toEqual(playing(1, 2));
  });

  test("ended on the last video returns to the first when looping", () => {
    expect(playlistReducer(playing(2, 3), { type: "ended" }, threeLoop)).toEqual(playing(0, 4));
  });

  test("ended on the last video stops without loop", () => {
    expect(playlistReducer(playing(2, 3), { type: "ended" }, three)).toMatchObject({ status: "idle" });
  });

  test("a single looping video restarts with a new playId", () => {
    expect(playlistReducer(playing(0, 1), { type: "ended" }, { length: 1, loop: true })).toEqual(playing(0, 2));
  });

  test("previous on the first video restarts it", () => {
    expect(playlistReducer(playing(0, 1), { type: "previous" }, three)).toEqual(playing(0, 2));
  });

  test("previous moves back one", () => {
    expect(playlistReducer(playing(2, 1), { type: "previous" }, three)).toEqual(playing(1, 2));
  });

  test("start out of range or on an empty list stays idle", () => {
    expect(playlistReducer(IDLE, { type: "start", index: 3 }, three)).toMatchObject({ status: "idle" });
    expect(playlistReducer(IDLE, { type: "start", index: -1 }, three)).toMatchObject({ status: "idle" });
    expect(playlistReducer(IDLE, { type: "start", index: 0 }, { length: 0, loop: true })).toMatchObject({ status: "idle" });
  });

  test("non-start actions while idle stay idle", () => {
    expect(playlistReducer(IDLE, { type: "next" }, three)).toMatchObject({ status: "idle" });
    expect(playlistReducer(IDLE, { type: "ended" }, threeLoop)).toMatchObject({ status: "idle" });
  });

  test("stop returns to idle", () => {
    expect(playlistReducer(playing(1, 2), { type: "stop" }, three)).toMatchObject({ status: "idle" });
  });

  test("a new run after stop keeps counting playIds up", () => {
    const stopped = playlistReducer(playing(0, 7), { type: "stop" }, three);
    expect(playlistReducer(stopped, { type: "start", index: 0 }, three)).toEqual(playing(0, 8));
  });
});

describe("seek", () => {
  test("moves the index without a new playId", () => {
    expect(playlistReducer(playing(1, 7), { type: "seek", index: 2 }, three)).toEqual(playing(2, 7));
  });

  test("is ignored when idle or out of range", () => {
    expect(playlistReducer(IDLE, { type: "seek", index: 1 }, three)).toEqual(IDLE);
    expect(playlistReducer(playing(1, 7), { type: "seek", index: 5 }, three)).toEqual(playing(1, 7));
  });
});
