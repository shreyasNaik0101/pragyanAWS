import React from "react";
import { FontReady } from "./fonts";
import { FONT_STACK } from "../../../remotion-service/src/remotion/fonts";
import {
  AbsoluteFill,
  Audio,
  Sequence,
  interpolate,
  useCurrentFrame,
} from "remotion";
import {
  timeline,
  themes,
  sceneCues,
  type Revision,
  type Segment,
} from "@pragyan/schema";
import { CodeScene } from "../../../remotion-service/src/remotion/scenes/CodeScene";
import { MathScene } from "../../../remotion-service/src/remotion/scenes/MathScene";
import { DiagramScene } from "../../../remotion-service/src/remotion/scenes/DiagramScene";
import { StageScene } from "../../../remotion-service/src/remotion/scenes/StageScene";
import { WhiteboardScene } from "../../../remotion-service/src/remotion/scenes/WhiteboardScene";
import { PhotosynthesisScene } from "../../../remotion-service/src/remotion/scenes/PhotosynthesisScene";
import { ConceptScene } from "../../../remotion-service/src/remotion/scenes/ConceptScene";
export type VideoProps = {
  revision: Revision;
  audioUrls?: Record<string, string>;
};
function SceneView({
  revision,
  index,
  audioUrls,
}: VideoProps & { index: number }) {
  const scene = revision.scenes[index],
    frame = useCurrentFrame(),
    theme = themes[revision.theme];
  const cue =
    sceneCues(scene).find((c) => frame >= c.start && frame < c.end)?.text || "";
  const segment = {
    ...scene.visual,
    text: scene.title,
    audio_url: undefined,
  } as Segment;
  const props = {
    segment: segment as never,
    index,
    total: revision.scenes.length,
    theme,
  };
  const View = {
    code: CodeScene,
    math: MathScene,
    diagram: DiagramScene,
    stage: StageScene,
    whiteboard: WhiteboardScene,
    photosynthesis: PhotosynthesisScene,
    concept: ConceptScene,
  }[segment.kind];
  return (
    <AbsoluteFill
      style={{
        background: theme.background,
        opacity: interpolate(frame, [0, 8], [0, 1], {
          extrapolateRight: "clamp",
        }),
      }}
    >
      <View {...props} />
      <div
        style={{
          position: "absolute",
          bottom: 0,
          left: 0,
          right: 0,
          padding: "18px 48px",
          minHeight: 86,
          background: theme.background,
          borderTop: "1px solid #ddd9d2",
          fontFamily: FONT_STACK,
          fontSize: 23,
          lineHeight: 1.4,
          color: theme.text,
        }}
      >
        {cue}
      </div>
      <div
        style={{
          position: "absolute",
          right: 28,
          top: 18,
          fontFamily: "Arial",
          fontSize: 15,
          letterSpacing: 3,
          color: theme.primary,
        }}
      >
        PRAGYAN
      </div>
      {scene.audio.status === "ready" && audioUrls?.[scene.id] && (
        <Audio src={audioUrls[scene.id]} />
      )}
    </AbsoluteFill>
  );
}
export function PragyanVideo(props: VideoProps) {
  const t = timeline(props.revision);
  return (
    <AbsoluteFill style={{ fontFamily: FONT_STACK }}>
      <FontReady language={props.revision.language} />
      {t.scenes.map((s, i) => (
        <Sequence key={s.id} from={s.start} durationInFrames={s.frames}>
          <SceneView {...props} index={i} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
}
