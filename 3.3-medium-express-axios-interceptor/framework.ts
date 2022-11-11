/* eslint-disable no-console */
import { compose, storytellerHelper } from "@micro-package/storyteller";
import { createValueObject, forgeValueObject } from "@micro-package/container/value-object";
import { storytellerPlugin } from "@micro-package/storyteller";
import { expressPlugin } from "@micro-package/express";
import { axiosPlugin } from "@micro-package/axios";
import { port, mockDefinitions, apiDefinitions } from "./definitions";
import type { ExpressMockDefinition, AxiosApiDefinition } from "./definitions";

export enum StepName {
  arrangeGoogleEndpoint = "arrangeGoogleEndpoint",
  actGoogleEndpoint = "actGoogleEndpoint",
  stepAssert = "stepAssert",
}

export const testFramework = compose(
  createValueObject(),
  expressPlugin<ExpressMockDefinition>({ port, mockDefinitions }),
  axiosPlugin<AxiosApiDefinition>({ apiDefinitions }),
  storytellerPlugin<StepName>({}),
  forgeValueObject({ debug: false }),
  storytellerHelper,
);
