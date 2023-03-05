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
import type { AxiosApiDefinition, ExpressMockDefinition } from "./definitions";

//* you can implement your own state in value object using plugin, but for sake simplicity of this example plugin won't be used here
export const testState: {
  number?: number;
  street?: string;
  city?: string;
  postcode?: string;
  address: string;
} = { address: "" };

export const delimiter = " / ";

export enum StepName {
  arrangeAddNumber = "arrangeAddNumber",
  arrangeAddStreet = "arrangeAddStreet",
  arrangeAddCity = "arrangeAddCity",
  arrangeAddPostcode = "arrangeAddPostcode",

  actAppendNumber = "arrangeAddNumber",
  actAppendStreet = "arrangeAddStreet",
  actAppendCity = "arrangeAddCity",
  actAppendPostcode = "arrangeAddPostcode",

  assert = "assert",
}

export const testFramework = compose(
  createValueObject(),
  storytellerPlugin<StepName>({}),
  expressPlugin<ExpressMockDefinition>({ port, mockDefinitions }),
  axiosPlugin<AxiosApiDefinition>({ apiDefinitions }),
  forgeValueObject({ debug: false }),
  storytellerHelper,
);
