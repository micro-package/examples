/* eslint-disable no-console */
import { EndpointName, StepName, testFramework } from "./framework";
import { responses, stepAct, stepArrange } from "./steps";
import { expect } from "@jest/globals";
describe("example 1.1", () => {
  it(
    "example 1.1",
    testFramework.createStory({
      arrange: stepArrange,
      act: stepAct,
      assert: testFramework.createStep({
        name: StepName.stepAssert,
        //* if valueObject shows up as any type, cute handle, save, paste handler, save
        handler: async (valueObject) => {
          const axiosResponses = valueObject.axiosGetResponses({
            endpointName: EndpointName.googleMainPage,
            //* paths are optional, if unspecified all data will be returned
            paths: ["response", "apiName", "endpointName", "method", "url"],
          });
          expect(axiosResponses).toStrictEqual(responses);
        },
      }),
    }),
  );
});
