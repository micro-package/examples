/* eslint-disable @typescript-eslint/no-unused-vars, no-console, no-unused-vars */
import {
  compose,
  createValueObject,
  forgeValueObject,
  storytellerHelper,
  storytellerPlugin,
  StorytellerHookName,
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

const finishFramework = async () => {
  await testFramework.runHooks({ name: StorytellerHookName.storytellerFinished });
};
