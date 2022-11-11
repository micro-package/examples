/* eslint-disable no-console */
import { compose, storytellerHelper } from "@micro-package/storyteller";
import { createValueObject, forgeValueObject } from "@micro-package/container/value-object";
import { storytellerPlugin } from "@micro-package/storyteller";

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
