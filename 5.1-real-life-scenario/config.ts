import dotenv from "dotenv";

const config = dotenv.config({
  path: `${__dirname}/.env`,
});

if (config.parsed === undefined) {
  throw Error("Test has missing env variables");
}

export const env = config.parsed;
