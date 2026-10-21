import "dotenv/config";
import { createApp } from "./app";
import { service } from "../core/runtime";
if (process.env.RUNTIME === "aws")
  throw new Error("Local API must not use AWS adapters");
createApp(service, false).listen(4000, "127.0.0.1", () =>
  console.log("Pragyan local API on http://127.0.0.1:4000 — fixture mode"),
);
