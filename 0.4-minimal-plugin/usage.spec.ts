/* eslint-disable no-console */
import { StepName, testFramework } from "./framework";
import { actAddLowercaseMessagesCopy, arrangeAddMessage1, arrangeAddMessage2 } from "./steps";
import { expect } from "@jest/globals";

describe("example 0.4", () => {
  it(
    "example 0.4",
    testFramework.createScenario({
      arrange: testFramework.composeSection(arrangeAddMessage1, arrangeAddMessage2),
      act: actAddLowercaseMessagesCopy,
      assert: testFramework.createStep({
        name: StepName.assert,
        handler: async (valueObject) => {
          const messages = await valueObject.exampleGetMessages();

          expect(messages.length).toBeGreaterThanOrEqual(2);
          console.log({ messages });
        },
      }),
    }),
  );
});