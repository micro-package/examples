/* eslint-disable @typescript-eslint/no-unused-vars, no-console, no-unused-vars */
import { compose, createValueObject, forgeValueObject, storytellerHelper } from "@micro-package/storyteller";
import { storytellerPlugin } from "@micro-package/storyteller";
import { StorytellerHookName } from "@micro-package/storyteller/plugins/storyteller/types";

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
