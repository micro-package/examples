import axios from "axios";
import { StatusCodes } from "http-status-codes";
import { env } from "../config";

const url = env.APP_ENV === "test" ? `http://js:${env.MOCK_SERVER_PORT}/agify` : "https://api.agify.io";

export const agify = async (payload: { name: string }) => {
  const result = await axios({
    url: `${url}?name=${payload.name}`,
    validateStatus: () => true, // disable throwing errors by axios itself
  });
  if (result.status !== StatusCodes.OK) {
    throw Error(`Agify failed ${result.status} - ${result.statusText}`);
  }
  return result.data.age;
};
