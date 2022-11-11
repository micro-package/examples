/* eslint-disable no-console */
import { compose, storytellerHelper } from "@micro-package/storyteller";
import { createValueObject, forgeValueObject } from "@micro-package/container/value-object";
import { storytellerPlugin } from "@micro-package/storyteller";
import { StorytellerHookName } from "@micro-package/storyteller/types";
import { expressPlugin } from "@micro-package/express";
import { axiosPlugin } from "@micro-package/axios";
import type { ExpressMockDefinition } from "./definitions/mock-definition";
import type { AxiosApiDefinition } from "./definitions/api-definition";
import type { StepName } from "./definitions/step";
import { port, mockDefinitions } from "./definitions/mock-definition";
import { apiDefinitions } from "./definitions/api-definition";

export const testFramework = compose(
  createValueObject(),
  expressPlugin<ExpressMockDefinition>({ port, mockDefinitions }),
  axiosPlugin<AxiosApiDefinition>({ apiDefinitions }),
  storytellerPlugin<StepName>({}),
  forgeValueObject({ debug: false }),
  storytellerHelper,
);

//* this after all hook is required to unit test steps, test framework finished hook tells express to shut down http server
//* if express server don't close correctly it may hang your tests, to reset them reload vscode or restart host machine
afterAll(async () => {
  await testFramework.runHooks({ name: StorytellerHookName.storytellerFinished });
});
