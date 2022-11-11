import { EndpointName } from "../definitions";
import { delimiter, StepName, testFramework, testState } from "../framework";
//* direct axios calls (not trough valueObject) should be treated as calls from source different than framework (e.g. app which is testee)

export const actAppendNumber = testFramework.createStep({
  name: StepName.actAppendNumber,
  handler: async (valueObject) => {
    const result = await valueObject.axiosRequest({
      endpointName: EndpointName.number,
      config: async () => ({}),
    });
    testState.number = result.response.data.number;
    testState.address += testState.number + delimiter;
  },
});

export const actAppendStreet = testFramework.createStep({
  name: StepName.actAppendStreet,
  handler: async (valueObject) => {
    const result = await valueObject.axiosRequest({
      endpointName: EndpointName.street,
      config: async () => ({}),
    });
    testState.street = result.response.data.street;
    testState.address += testState.street + delimiter;
  },
});

export const actAppendCity = testFramework.createStep({
  name: StepName.actAppendCity,
  handler: async (valueObject) => {
    const result = await valueObject.axiosRequest({
      endpointName: EndpointName.city,
      config: async () => ({}),
    });
    testState.city = result.response.data.city;
    testState.address += testState.city + delimiter;
  },
});

export const actAppendPostcode = testFramework.createStep({
  name: StepName.actAppendPostcode,
  handler: async (valueObject) => {
    const result = await valueObject.axiosRequest({
      endpointName: EndpointName.zipCode,
      config: async () => ({}),
    });
    testState.postcode = result.response.data.zipCode;
    testState.address += testState.postcode + delimiter;
  },
});
