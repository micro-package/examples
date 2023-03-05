import { createValueObject, forgeValueObject, storytellerPlugin } from "@micro-package/storyteller";
import { compose, storytellerHelper } from "@micro-package/storyteller";
import { examplePlugin } from "./plugin";

export enum StepName {
  addMessage1 = "addMessage1",
  addMessage2 = "addMessage2",
  addLowercaseMessagesCopy = "addLowercaseMessagesCopy",

  assert = "assert",
}

export const testFramework = compose(
  createValueObject(),
  storytellerPlugin<StepName>({}),
  examplePlugin,
  forgeValueObject({ debug: false }),
  storytellerHelper,
);
