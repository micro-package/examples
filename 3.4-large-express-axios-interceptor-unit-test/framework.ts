/* eslint-disable no-console */
import {
  axiosPlugin,
  compose,
  createValueObject,
  expressPlugin,
  forgeValueObject,
  storytellerHelper,
} from "@micro-package/storyteller";
import { storytellerPlugin } from "@micro-package/storyteller";

import type { ExpressMockDefinition } from "./definitions/mock-definition";
import type { AxiosApiDefinition } from "./definitions/api-definition";
import type { StepName } from "./definitions/step";
import { port, mockDefinitions } from "./definitions/mock-definition";
import { apiDefinitions } from "./definitions/api-definition";
import { StorytellerHookName } from "@micro-package/storyteller/plugins/storyteller/types";

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
