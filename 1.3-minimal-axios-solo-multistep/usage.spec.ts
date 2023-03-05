/* eslint-disable no-console */
import { EndpointName, StepName, testFramework } from "./framework";
import { responses, stepAct, stepArrange } from "./steps";
import { expect } from "@jest/globals";
describe("example 1.3", () => {
  it(
    "example 1.3",
    testFramework.createStory({
      arrange: stepArrange({ text: "some kind message" }),
      act: testFramework.composeSection(stepAct({ data: "some evil message" }), stepAct({ data: "some evil message" })),
      assert: testFramework.createStep({
        name: StepName.stepAssert,
        handler: async (valueObject) => {
          const axiosResponse = valueObject.axiosGetResponses({
            endpointName: EndpointName.googleMainPage,
            paths: ["response", "apiName", "endpointName", "method", "url"],
          });
          expect(axiosResponse).toStrictEqual(responses);
        },
      }),
    }),
  );
});
