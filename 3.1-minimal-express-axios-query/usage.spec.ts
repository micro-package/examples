/* eslint-disable no-console */
import { StatusCodes } from "http-status-codes";
import { EndpointName, StepName, testFramework } from "./framework";
import { stepAct, stepArrange } from "./steps";
import { expect } from "@jest/globals";
describe("example 3.1", () => {
  it(
    "example 3.1",
    testFramework.createStory({
      arrange: stepArrange(StatusCodes.INSUFFICIENT_SPACE_ON_RESOURCE),
      act: stepAct({ requestDataField1: "some kind message" }),
      assert: testFramework.createStep({
        name: StepName.stepAssert,
        handler: async (valueObject) => {
          const executions = valueObject.expressGetExecutions({
            endpointName: EndpointName.googleMainPage,
            paths: ["request.query", "response.statusCode"],
          });
          const axiosResponses = valueObject.axiosGetResponses({
            endpointName: EndpointName.googleMainPage,
            paths: ["response.config", "response.status"],
          });
          expect(executions[0].request.query).toStrictEqual(axiosResponses[0].response.config.params);
          expect(axiosResponses[0].response.status).toStrictEqual(executions[0].response.statusCode);
        },
      }),
    }),
  );
});
