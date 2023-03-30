const Koa = require("koa");
const Router = require("koa-router");
const axios = require("axios");
const AWS = require("aws-sdk");

const app = new Koa();
const router = new Router();

AWS.config.update({ region: "your_region" });
const dynamodb = new AWS.DynamoDB.DocumentClient();

const tableName = "AgeNamePairs";

const agify = async (name) => {
  const response = await axios.get(`https://api.agify.io?name=${name}`);
  return response.data.age;
};

const addRecord = async (name, age) => {
  const params = {
    TableName: tableName,
    Item: { name, age },
  };
  await dynamodb.put(params).promise();
};

const getAverageAge = async () => {
  const params = {
    TableName: tableName,
    Select: "SPECIFIC_ATTRIBUTES",
    ProjectionExpression: "age",
  };

  const data = await dynamodb.scan(params).promise();
  const sum = data.Items.reduce((acc, item) => acc + item.age, 0);
  return sum / data.Items.length;
};

const getAverageAgeByName = async (name) => {
  const params = {
    TableName: tableName,
    IndexName: "name-index",
    KeyConditionExpression: "name = :name",
    ExpressionAttributeValues: {
      ":name": name,
    },
    ProjectionExpression: "age",
  };

  const data = await dynamodb.query(params).promise();
  const sum = data.Items.reduce((acc, item) => acc + item.age, 0);
  return sum / data.Items.length;
};

const getAmountForName = async (name) => {
  const params = {
    TableName: tableName,
    IndexName: "name-index",
    KeyConditionExpression: "name = :name",
    ExpressionAttributeValues: {
      ":name": name,
    },
  };

  const data = await dynamodb.query(params).promise();
  return data.Items.length;
};

router.get("/name-to-age/:name", async (ctx) => {
  const age = await agify(ctx.params.name);
  await addRecord(ctx.params.name, age);
  ctx.body = { age };
});

router.get("/average-age", async (ctx) => {
  ctx.body = { age: await getAverageAge() };
});

router.get("/average-age/:name", async (ctx) => {
  ctx.body = { age: await getAverageAgeByName(ctx.params.name) };
});

router.get("/requests-for-age/:name", async (ctx) => {
  ctx.body = { amount: await getAmountForName(ctx.params.name) };
});

app.use(router.routes()).use(router.allowedMethods());

const port = 3000;
app.listen(port, () => {
  console.log(`App ready & listening on port ${port}`);
});