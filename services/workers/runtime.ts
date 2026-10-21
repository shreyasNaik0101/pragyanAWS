import { service } from "../core/runtime";
import { cloud, blobs } from "../core/storage";
import { LocalProviders, AwsProviders } from "../core/providers";
import { LocalRenderer, LambdaRenderer } from "./renderers";
import { Worker } from "./engine";
export const worker = new Worker(
  service,
  cloud ? new AwsProviders() : new LocalProviders(),
  cloud ? new LambdaRenderer(blobs) : new LocalRenderer(blobs),
);
