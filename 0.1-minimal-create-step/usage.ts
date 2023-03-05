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

testFramework.createStep({
  name: StepName.helloWorld,
  handler: async (valueObject) => {
    console.log(valueObject);
  },
});
