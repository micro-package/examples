import express from "express";
import { StatusCodes } from "http-status-codes";
import { agify } from "./integration";
import { repository } from "./repository";

void (async () => {
  const app = express();
  const repo = await repository();

  app.get("/name-to-age/:name", async (req, res) => {
    const age = await agify({ name: req.params.name });
    if (age === null) {
      res.sendStatus(StatusCodes.CONFLICT);
      return;
    }
    await repo.create({ age, name: req.params.name });
    res.status(StatusCodes.OK).send(JSON.stringify({ age }));
  });
  app.get("/average-age", async (req, res) => {
    const age = await repo.getAverage();
    res.status(StatusCodes.OK).send(JSON.stringify({ age }));
  });
  app.get("/average-age/:name", async (req, res) => {
    const age = await repo.getAverageForName({ name: req.params.name });
    res.status(StatusCodes.OK).send(JSON.stringify({ age }));
  });
  app.get("/requests-for-age/:name", async (req, res) => {
    const amount = await repo.getAmountForName({ name: req.params.name });
    res.status(StatusCodes.OK).send(JSON.stringify({ amount }));
  });

  const port = 3000;
  app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`App ready & listening on port ${port}`);
})();
