/* eslint-disable no-console */
import { testFramework, StepName } from "./framework/framework";
import { arrangeAgifyEndpoint, arrangeClearAgeNamePairTable } from "./framework/arrange";
import {
  actAverageAgeEndpoint,
  actAverageAgeForNameEndpoint,
  actNameToAgeBatchEndpoint,
  actRequestsForAgeEndpoint,
} from "./framework/act";
import { ApiEndpointName, AppEndpointName } from "./framework/definitions";

const mockedAgifyResponses = [1, 2, 3, 4, 5];
describe("feature/name-age", () => {
  it(
    "User needs to know what is the *age* for specific *name* / happy path",
    testFramework.createScenario({
      arrange: testFramework.composeSection(
        arrangeClearAgeNamePairTable(),
        arrangeAgifyEndpoint({ age: mockedAgifyResponses }),
      ),
      act: actNameToAgeBatchEndpoint({ names: ["Tom", "Bob", "Anna", "Hannah", "Alice"] }),
      assert: testFramework.createStep({
        name: StepName.assert,
        handler: async (valueObject) => {
          const agifyRequests = valueObject.expressGetExecutions({ endpointName: ApiEndpointName.getAge });
          const nameToAgeResponses = valueObject.axiosGetResponses({ endpointName: AppEndpointName.nameToAge });

          //? check is what we sent to the app fitting to what app sent to the mock server
          expect(agifyRequests.map((agifyRequest) => agifyRequest.request.query.name)).toStrictEqual(
            nameToAgeResponses.map((nameToAgeResponse) => {
              const path = nameToAgeResponse.response.request.path;
              return path.substring(path.lastIndexOf("/") + 1);
            }),
          );
          //? check is what mock server returned fitting to what app returned
          expect(mockedAgifyResponses).toStrictEqual(
            nameToAgeResponses.map((nameToAgeResponse) => nameToAgeResponse.response.data.age),
          );
        },
      }),
    }),
  );

  it(
    "User needs to know how many times asked for *age* for specific *name* / happy path",
    testFramework.createScenario({
      arrange: testFramework.composeSection(
        arrangeClearAgeNamePairTable(),
        arrangeAgifyEndpoint({ age: mockedAgifyResponses }),
      ),
      act: testFramework.composeSection(
        actNameToAgeBatchEndpoint({ names: ["Tom", "Tom", "Tom", "Tom", "Tom"] }),
        actRequestsForAgeEndpoint({ name: "Tom" }),
      ),
      assert: testFramework.createStep({
        name: StepName.assert,
        handler: async (valueObject) => {
          const nameToAgeResponses = valueObject.axiosGetResponses({ endpointName: AppEndpointName.nameToAge });
          const requestsForAgeResponses = valueObject.axiosGetResponses({
            endpointName: AppEndpointName.requestsForAge,
          });
          expect(nameToAgeResponses.length).toStrictEqual(requestsForAgeResponses[0].response.data.amount);
        },
      }),
    }),
  );

  it(
    "User needs to know what is the *average age* for all people / happy path",
    testFramework.createScenario({
      arrange: testFramework.composeSection(
        arrangeClearAgeNamePairTable(),
        arrangeAgifyEndpoint({ age: mockedAgifyResponses }),
      ),
      act: testFramework.composeSection(
        actNameToAgeBatchEndpoint({ names: ["Tom", "Bob", "Anna", "Hannah", "Alice"] }),
        actAverageAgeEndpoint(),
      ),
      assert: testFramework.createStep({
        name: StepName.assert,
        handler: async (valueObject) => {
          const nameToAgeResponses = valueObject.axiosGetResponses({ endpointName: AppEndpointName.averageAge });
          expect(nameToAgeResponses.length).toStrictEqual(1);
          expect(nameToAgeResponses[0].response.data.age).toStrictEqual(
            nameToAgeResponses
              .map((nameToAgeResponse) => nameToAgeResponse.response.data.age)
              .reduce((acc, val) => acc + val, 0) / nameToAgeResponses.length,
          );
        },
      }),
    }),
  );

  it(
    "User needs to know what is the *average age* for specific name / happy path",
    testFramework.createScenario({
      arrange: testFramework.composeSection(
        arrangeClearAgeNamePairTable(),
        arrangeAgifyEndpoint({ age: mockedAgifyResponses }),
      ),
      act: testFramework.composeSection(
        actNameToAgeBatchEndpoint({ names: ["Tom", "Tom", "Tom", "Tom", "Tom"] }),
        actAverageAgeForNameEndpoint({ name: "Tom" }),
      ),
      assert: testFramework.createStep({
        name: StepName.assert,
        handler: async (valueObject) => {
          const nameToAgeResponses = valueObject.axiosGetResponses({ endpointName: AppEndpointName.averageAgeForName });
          expect(nameToAgeResponses.length).toStrictEqual(1);
          expect(nameToAgeResponses[0].response.data.age).toStrictEqual(
            nameToAgeResponses
              .map((nameToAgeResponse) => nameToAgeResponse.response.data.age)
              .reduce((acc, val) => acc + val, 0) / nameToAgeResponses.length,
          );
        },
      }),
    }),
  );
});
