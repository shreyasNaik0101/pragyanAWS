import React from "react";
import { Composition, registerRoot } from "remotion";
import { PragyanVideo } from "./Composition";
import { fixture } from "../../schema/src/fixtures";
import { FPS, WIDTH, HEIGHT, timeline, RevisionSchema } from "@pragyan/schema";
const revision = fixture(
  {
    title: "How the internet works",
    workflow: "concept",
    language: "english",
    audience: "beginner",
    context: "",
    sourceText: "",
  },
  [],
);
registerRoot(() => (
  <Composition
    id="Pragyan"
    component={PragyanVideo}
    fps={FPS}
    width={WIDTH}
    height={HEIGHT}
    durationInFrames={timeline(revision).totalFrames}
    defaultProps={{ revision, audioUrls: {} }}
    calculateMetadata={({ props }) => ({
      durationInFrames: timeline(RevisionSchema.parse(props.revision))
        .totalFrames,
    })}
  />
));
