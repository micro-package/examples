import { StatusCodes } from "http-status-codes";
import { falso } from "@micro-package/common/falso";
import { EndpointName } from "../definitions";
import { StepName, testFramework } from "../framework";

export const arrangeAddNumber = testFramework.createStep({
  name: StepName.arrangeAddNumber,
  handler: async (valueObject) => {
    await valueObject.expressMock({
      endpointName: EndpointName.number,
      handlers: Array.from<any>({ length: 100 }).fill([
        (req: any, res: any) => {
          res.status(StatusCodes.OK).send(JSON.stringify({ number: falso.randNumber() }));
        },
      ]),
    });
  },
});

export const arrangeAddStreet = testFramework.createStep({
  name: StepName.arrangeAddStreet,
  handler: async (valueObject) => {
    await valueObject.expressMock({
      endpointName: EndpointName.street,
      handlers: Array.from<any>({ length: 100 }).fill([
        (req: any, res: any) => {
          res.status(StatusCodes.OK).send(JSON.stringify({ street: falso.randStreetName() }));
        },
      ]),
    });
  },
});

export const arrangeAddCity = testFramework.createStep({
  name: StepName.arrangeAddCity,
  handler: async (valueObject) => {
    await valueObject.expressMock({
      endpointName: EndpointName.city,
      handlers: Array.from<any>({ length: 100 }).fill([
        (req: any, res: any) => {
          res.status(StatusCodes.OK).send(JSON.stringify({ city: falso.randCity() }));
        },
      ]),
    });
  },
});

export const arrangeAddPostcode = testFramework.createStep({
  name: StepName.arrangeAddPostcode,
  handler: async (valueObject) => {
    await valueObject.expressMock({
      endpointName: EndpointName.zipCode,
      handlers: Array.from<any>({ length: 100 }).fill([
        (req: any, res: any) => {
          res.status(StatusCodes.OK).send(JSON.stringify({ zipCode: falso.randZipCode() }));
        },
      ]),
    });
  },
});
