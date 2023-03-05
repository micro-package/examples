/* eslint-disable no-console */
import { testFramework, StepName } from "./framework";
import http from "http";
import { StatusCodes } from "http-status-codes";
import { arrangeGoogleEndpoint } from "./arrange/google";
import { actGoogleEndpoint } from "./act/google";
import { EndpointName } from "./definitions";
import { expect } from "@jest/globals";
export const externalApi = {
  responseStatusCode: StatusCodes.OK,
  responseDataString: "External api returned data",
  url: "http://localhost:5954",
};

describe("example 3.3", () => {
  const server = http.createServer((req, res) => {
    console.log("External api called", req.url);
    res.writeHead(externalApi.responseStatusCode);
    res.end(externalApi.responseDataString);
  });
  server.listen(new URL(externalApi.url).port);
  process.on("beforeExit", () => {
    server.close();
  });
  setTimeout(server.close, 2500);
  it(
    "example 3.3",
    testFramework.createStory({
      arrange: arrangeGoogleEndpoint(),
      act: actGoogleEndpoint({ requestDataField1: "some kind message" }),
      assert: testFramework.createStep({
        name: StepName.stepAssert,
        handler: async (valueObject) => {
          server.close();
          const executions = valueObject.expressGetExecutions({
            endpointName: EndpointName.googleMainPage,
            //? there is currently no way to read responded data ( is it needed? )
            paths: ["response.statusCode"],
          });
          const axiosResponses = valueObject.axiosGetResponses({
            endpointName: EndpointName.googleMainPage,
            paths: ["response.config", "response.status", "response.data"],
          });
          expect(axiosResponses[0].response.data).toStrictEqual(externalApi.responseDataString);
          expect(axiosResponses[0].response.status).toStrictEqual(externalApi.responseStatusCode);
          expect(executions[0].response.statusCode).toStrictEqual(externalApi.responseStatusCode);
        },
      }),
    }),
  );
});
