const express = require("express");
const cors = require("cors");
const { AgeNamePair } = require("./repository");
const { createConnection } = require("typeorm");

const app = express();
app.use(cors());

const config = {
  port: process.env.APP_PORT || 3000,
  env: process.env.APP_ENV || "development",
};

console.log("Application configuration:", config);

createConnection().then(() => {
  console.log("Connected to the database");

  app.get("/name-to-age/:name", async (req, res) => {
    const { name } = req.params;
    const age = await AgeNamePair.getAgeForName(name);
    res.json({ age });
  });

  app.get("/requests-for-age/:name", async (req, res) => {
    const { name } = req.params;
    const amount = await AgeNamePair.getRequestsForAge(name);
    res.json({ amount });
  });

  app.get("/average-age", async (_req, res) => {
    const averageAge = await AgeNamePair.getAverageAge();
    res.json({ age: averageAge });
  });

  app.get("/average-age/:name", async (req, res) => {
    const { name } = req.params;
    const averageAge = await AgeNamePair.getAverageAgeForName(name);
    res.json({ age: averageAge });
  });

  app.listen(config.port, () => {
    console.log(`Server running at http://localhost:${config.port}`);
  });
}).catch((error) => console.log("TypeORM connection error: ", error));