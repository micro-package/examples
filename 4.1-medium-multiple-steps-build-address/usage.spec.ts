/* eslint-disable no-console */
import { actAppendNumber, actAppendPostcode, actAppendStreet, actAppendCity } from "./act/address";
import { arrangeAddCity, arrangeAddNumber, arrangeAddPostcode, arrangeAddStreet } from "./arrange/address";
import { delimiter, StepName, testFramework, testState } from "./framework";
import { expect } from "@jest/globals";
describe("4.1 multiple steps scenario", () => {
  it(
    "4.1 multiple steps scenario",
    testFramework.createStory({
      arrange: testFramework.composeSection(arrangeAddNumber, arrangeAddCity, arrangeAddPostcode, arrangeAddStreet),
      act: testFramework.composeSection(actAppendNumber, actAppendCity, actAppendPostcode, actAppendStreet),
      assert: testFramework.createStep({
        name: StepName.assert,
        handler: async () => {
          expect(testState.address).toStrictEqual(
            [testState.number, testState.city, testState.postcode, testState.street]
              .map((element) => `${element}${delimiter}`)
              .join(""),
          );
        },
      }),
    }),
  );
});
