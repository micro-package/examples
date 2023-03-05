/* eslint-disable no-console */
import { StatusCodes } from "http-status-codes";
import { ApiName, EndpointName, mockDefinitions, StepName, testFramework } from "./framework";
import { stepAct, stepArrange } from "./steps";
import { expect } from "@jest/globals";
describe("example 2.2", () => {
  it(
    "example 2.2",
    testFramework.createStory({
      arrange: stepArrange(),
      act: testFramework.composeSection(stepAct(), stepAct()),
      assert: testFramework.createStep({
        name: StepName.stepAssert,
        handler: async (valueObject) => {
          const mock = valueObject.expressGetMock({ endpointName: EndpointName.googleMainPage });
          const executions = valueObject.expressGetExecutions({
            endpointName: EndpointName.googleMainPage,
            paths: ["response.statusCode"],
          });
          expect(executions).toStrictEqual([
            { response: { statusCode: StatusCodes.OK } },
            { response: { statusCode: StatusCodes.IM_A_TEAPOT } },
          ]);
          expect(mock).toStrictEqual({
            ...mockDefinitions[0],
            url: `${new URL(mockDefinitions[0].url).origin}/${ApiName.google}${
              new URL(mockDefinitions[0].url).pathname
            }`,
            endpointName: EndpointName.googleMainPage,
            handlers: [[expect.any(Function)]],
          });
        },
      }),
    }),
  );
});
