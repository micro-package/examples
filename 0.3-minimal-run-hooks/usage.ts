/* eslint-disable @typescript-eslint/no-unused-vars, no-console, no-unused-vars */
import { compose, storytellerHelper } from "@micro-package/storyteller";
import { storytellerPlugin } from "@micro-package/storyteller";
import { StorytellerHookName } from "@micro-package/storyteller/types";
import { createValueObject, forgeValueObject } from "@micro-package/container/value-object";

enum StepName {
  helloWorld = "helloWorld",
}

const testFramework = compose(
  createValueObject(),
  storytellerPlugin<StepName>({}),
  forgeValueObject({ debug: false }),
  storytellerHelper,
);

const finishFramework = async () => {
  await testFramework.runHooks({ name: StorytellerHookName.storytellerFinished });
};
