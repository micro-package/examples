import { config } from "dotenv";

const appConfig = config({
  path: `${__dirname}/.env`,
});

if (appConfig.parsed === undefined) {
  throw Error("Test has missing env variables");
}

export const env = appConfig.parsed;
