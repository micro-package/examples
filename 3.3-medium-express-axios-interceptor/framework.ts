/* eslint-disable no-console */
import {
  axiosPlugin,
  compose,
  createValueObject,
  expressPlugin,
  forgeValueObject,
  storytellerHelper,
  storytellerPlugin,
} from "@micro-package/storyteller";
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
