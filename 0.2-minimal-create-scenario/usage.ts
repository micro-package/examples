/* eslint-disable no-console */
import {
  compose,
  createValueObject,
  forgeValueObject,
  storytellerHelper,
  storytellerPlugin,
} from "@micro-package/storyteller";

enum StepName {
  helloWorld = "helloWorld",
}

const testFramework = compose(
  createValueObject(),
  storytellerPlugin<StepName>({}),
  forgeValueObject({ debug: false }),
  storytellerHelper,
);

const step = testFramework.createStep({
  name: StepName.helloWorld,
  handler: async (valueObject) => {
    console.log(valueObject);
  },
});

testFramework.createStory({
  arrange: step,
  act: step,
  assert: step,
});
