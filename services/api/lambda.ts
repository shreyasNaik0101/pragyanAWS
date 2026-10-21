import serverlessExpress from "@codegenie/serverless-express";
import { createApp } from "./app";
import { service } from "../core/runtime";
export const handler = serverlessExpress({ app: createApp(service, true) });
