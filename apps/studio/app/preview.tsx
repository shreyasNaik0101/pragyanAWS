"use client";
import React from "react";
import { Player, type PlayerRef } from "@remotion/player";
import { PragyanVideo } from "@pragyan/video";
import { timeline, FPS, WIDTH, HEIGHT, type Revision } from "@pragyan/schema";
export default function Preview({
  revision,
  audioUrls,
  playerRef,
}: {
  revision: Revision;
  audioUrls: Record<string, string>;
  playerRef: React.RefObject<PlayerRef | null>;
}) {
  return (
    <Player
      ref={playerRef}
      component={PragyanVideo}
      inputProps={{ revision, audioUrls }}
      durationInFrames={Math.max(1, timeline(revision).totalFrames)}
      compositionWidth={WIDTH}
      compositionHeight={HEIGHT}
      fps={FPS}
      controls
      clickToPlay
      doubleClickToFullscreen
      style={{ width: "100%", aspectRatio: "16/9" }}
      acknowledgeRemotionLicense
    />
  );
}
