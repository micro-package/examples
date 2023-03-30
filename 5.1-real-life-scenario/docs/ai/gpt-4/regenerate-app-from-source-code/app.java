import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import com.amazonaws.services.dynamodbv2.document.DynamoDB;
import com.amazonaws.services.dynamodbv2.document.Item;
import com.amazonaws.services.dynamodbv2.document.QueryOutcome;
import com.amazonaws.services.dynamodbv2.document.spec.QuerySpec;
import com.amazonaws.services.dynamodbv2.model.AttributeValue;
import com.amazonaws.services.lambda.runtime.Context;
import com.amazonaws.services.lambda.runtime.RequestHandler;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyRequestEvent;
import com.amazonaws.services.lambda.runtime.events.APIGatewayProxyResponseEvent;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import org.apache.http.HttpStatus;
import spark.Spark.*;
import retrofit2.Call;
import retrofit2.Response;
import retrofit2.Retrofit;
import retrofit2.converter.gson.GsonConverterFactory;
import retrofit2.http.GET;
import retrofit2.http.Query;

import java.util.HashMap;
import java.util.OptionalDouble;

public class Main {
    private static final AmazonDynamoDB CLIENT = AmazonDynamoDBClientBuilder.standard().build();
    private static final DynamoDB DYNAMO_DB = new DynamoDB(CLIENT);
    private static final String TABLE_NAME = "AgeNamePairs";
    private static final Gson GSON = new GsonBuilder().setPrettyPrinting().create();

    public static void main(String[] args) {
        port(3000);

        // Store age for a name
        app.get("/name-to-age/:name", ctx -> {
            String name = ctx.pathParam("name");
            try {
                AgifyResponse agifyResponse = getAgeFromAgify(name);
                if (agifyResponse.getAge() == null) {
                    ctx.status(HttpStatus.CONFLICT_409);
                } else {
                    ageNamePairRepository.create(new AgeNamePair(agifyResponse.getName(), agifyResponse.getAge()));
                    ctx.status(HttpStatus.OK_200).json(Map.of("age", agifyResponse.getAge()));
                }
            } catch (Exception e) {
                ctx.status(HttpStatus.INTERNAL_SERVER_ERROR_500).result(e.getMessage());
            }
        });

        // Get average age
        get("/average-age", (request, response) -> {
            double averageAge = getAverageAge();
            response.status(200);
            response.type("application/json");
            return "{\"average_age\": " + averageAge + "}";
        });

        // Get average age for a name
        get("/average-age/:name", (request, response) -> {
            String name = request.params(":name");
            double averageAge = getAverageAgeForName(name);
            if (Double.isNaN(averageAge)) {
                response.status(404);
                return "Not found";
            } else {
                response.status(200);
                response.type("application/json");
                return "{\"average_age\": " + averageAge + "}";
            }
        });

        // Get the number of requests for a specific name
        get("/requests-for-age/:name", (request, response) -> {
            String name = request.params(":name");
            long count = getRequestCountForName(name);
            response.status(200);
            response.type("application/json");
            return "{\"count\": " + count + "}";
        });
    }

    public interface AgifyService {
        @GET("https://api.agify.io/")
        Call<AgifyResponse> getAge(@Query("name") String name);
    }

    private static void storeAgeForName(String name, int age) {
        Item item = new Item()
                .withPrimaryKey("name", name, "age", age);
        DYNAMO_DB.getTable(TABLE_NAME).putItem(item);
    }

    private static double getAverageAge() {
        ScanSpec scanSpec = new ScanSpec();
        ItemCollection<ScanOutcome> items = DYNAMO_DB.getTable(TABLE_NAME).scan(scanSpec);
        OptionalDouble average = items.stream()
                .mapToInt(item -> item.getInt("age"))
                .average();

        return average.orElse(Double.NaN);
    }

    private static double getAverageAgeForName(String name) {
        QuerySpec querySpec = new QuerySpec()
                .withKeyConditionExpression("name = :v_name")
                .withValueMap(new ValueMap().withString(":v_name", name));
        ItemCollection<QueryOutcome> items = DYNAMO_DB.getTable(TABLE_NAME).query(querySpec);

        OptionalDouble average = items.stream()
                .mapToInt(item -> item.getInt("age"))
                .average();

        return average.orElse(Double.NaN);
    }

    private static long getRequestCountForName(String name) {
        QuerySpec querySpec = new QuerySpec()
                .withKeyConditionExpression("name = :v_name")
                .withValueMap(new ValueMap().withString(":v_name", name));
        ItemCollection<QueryOutcome> items = DYNAMO_DB.getTable(TABLE_NAME).query(querySpec);

        return items.stream().count();
    }
    
    private static int getAgeFromAgify(String name) throws IOException {
        Retrofit retrofit = new Retrofit.Builder()
                .baseUrl("https://api.agify.io/")
                .addConverterFactory(GsonConverterFactory.create())
                .build();

        AgifyService service = retrofit.create(AgifyService.class);

        Call<AgifyResponse> call = service.getAge(name);
        Response<AgifyResponse> response = call.execute();

        if (response.isSuccessful()) {
            AgifyResponse agifyResponse = response.body();
            return agifyResponse.getAge();
        } else {
            throw new IOException("Agify request failed with status: " + response.code());
        }
    }
}

class AgifyResponse {
    private String name;
    private int age;
    private int count;
    private String country_id;

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public int getAge() {
        return age;
    }

    public void setAge(int age) {
        this.age = age;
    }

    public int getCount() {
        return count;
    }

    public void setCount(int count) {
        this.count = count;
    }

    public String getCountry_id() {
        return country_id;
    }

    public void setCountry_id(String country_id) {
        this.country_id = country_id;
    }
}