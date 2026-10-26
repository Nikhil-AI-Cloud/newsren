import type { NotConnected } from "@/types";
import type { QuestionAnswerer, UpdateChecker } from "./types";

const notConnected = (what: string): NotConnected => ({
  status: "not_connected",
  message: `${what} is not connected yet.`,
});

export const notConnectedAnswerer: QuestionAnswerer = {
  async ask() {
    return notConnected("Ask Newsren");
  },
};

export const notConnectedUpdateChecker: UpdateChecker = {
  async check() {
    return notConnected("Update checking");
  },
};
