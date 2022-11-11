import { falso } from "@micro-package/common/falso";
import { StepName, testFramework } from "./framework";

export const arrangeAddMessage1 = testFramework.createStep({
  name: StepName.addMessage1,
  handler: async (valueObject) => {
    await valueObject.exampleAddMessage({ message: `message-1: ${falso.randWord()}` });
  },
});

export const arrangeAddMessage2 = testFramework.createStep({
  name: StepName.addMessage2,
  handler: async (valueObject) => {
    await valueObject.exampleAddMessage({ message: `message-2: ${falso.randWord()}` });
  },
});

export const actAddLowercaseMessagesCopy = testFramework.createStep({
  name: StepName.addLowercaseMessagesCopy,
  handler: async (valueObject) => {
    for await (const message of await valueObject.exampleGetMessages()) {
      const lowerCaseMessage = message.toLowerCase();
      if (lowerCaseMessage !== message) {
        await valueObject.exampleAddMessage({ message: lowerCaseMessage });
      }
    }
  },
});
