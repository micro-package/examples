import {
  createValueObject,
  forgeValueObject,
  storytellerPlugin,
  compose,
  storytellerHelper,
} from "@micro-package/storyteller";
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
  forgeValueObject({ debug: true }),
  storytellerHelper,
);
