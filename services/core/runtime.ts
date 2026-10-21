import { store, blobs, cloud } from "./storage";
import { Service } from "./service";
import { LocalQueue, SqsQueue } from "./queue";
export const service = new Service(
  store,
  blobs,
  cloud ? new SqsQueue() : new LocalQueue(),
);
