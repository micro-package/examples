/* eslint-disable no-console */
import { testFramework } from "./framework";
import { arrangeGoogleEndpoint } from "./arrange/google/arrange-google-endpoint";
import { actGoogleEndpoint } from "./act/google/act-google-endpoint";
import { StepName } from "./definitions/step";
import { MockEndpointName } from "./definitions/mock-definition";
import { ApiEndpointName } from "./definitions/api-definition";
import { externalApi } from "./external-api";
import http from "http";
import { expect } from "@jest/globals";
describe("example 3.4", () => {
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
    "example 3.4",
    testFramework.createStory({
      arrange: arrangeGoogleEndpoint(),
      act: actGoogleEndpoint({ requestDataField1: "some kind message" }),
      //* should it be splitted to several steps??
      assert: testFramework.createStep({
        name: StepName.stepAssert,
        handler: async (valueObject) => {
          server.close();
          const executions = valueObject.expressGetExecutions({
            endpointName: MockEndpointName.googleMainPage,
            //? there is currently no way to read responded data
            //* do i need to know what is the responded data from external service when it is interceptor? ( when it is not it does not make sense since developer have full control on the result)
            paths: ["response.statusCode"],
          });
          const axiosResponses = valueObject.axiosGetResponses({
            endpointName: ApiEndpointName.googleMainPage,
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
