import {
  SageMakerRuntimeClient,
  InvokeEndpointCommand,
} from "@aws-sdk/client-sagemaker-runtime";

const smRuntimeClient = new SageMakerRuntimeClient({
  region: process.env.AWS_REGION || "us-east-1",
});

/**
 * Dummy iris features for testing
 * Features: [sepal_length, sepal_width, petal_length, petal_width]
 * - Setosa typical: [5.0, 3.4, 1.5, 0.2]
 * - Versicolor typical: [5.9, 2.7, 4.2, 1.3]
 * - Virginica typical: [6.7, 3.0, 5.5, 2.0]
 */
const DUMMY_IRIS_DATA = [
  [5.0, 3.4, 1.5, 0.2], // Expected: setosa
  [5.9, 2.7, 4.2, 1.3], // Expected: versicolor
  [6.7, 3.0, 5.5, 2.0], // Expected: virginica
];

/**
 * Invoke the SageMaker Iris endpoint with dummy data
 * @param {string} endpointName - The SageMaker endpoint name
 * @returns {Promise<Object>} Prediction response
 */
async function invokeIrisEndpoint(endpointName) {
  try {
    // Prepare request payload
    const payload = {
      data: DUMMY_IRIS_DATA,
    };

    const command = new InvokeEndpointCommand({
      EndpointName: endpointName,
      ContentType: "application/json",
      Accept: "application/json",
      Body: JSON.stringify(payload),
    });

    console.log(`🔄 Invoking endpoint: ${endpointName}`);
    console.log(`📊 Dummy iris data:`, DUMMY_IRIS_DATA);

    const response = await smRuntimeClient.send(command);

    // Parse response body
    const responseBody = JSON.parse(new TextDecoder().decode(response.Body));

    console.log("✅ Endpoint invocation successful");
    console.log("🎯 Predictions:", responseBody);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Successfully invoked iris endpoint",
        predictions: responseBody,
        timestamp: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error("❌ Error invoking endpoint:", error.message);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: "Failed to invoke iris endpoint",
        message: error.message,
      }),
    };
  }
}

/**
 * AWS Lambda handler
 * @param {Object} event - Lambda event
 * @returns {Promise<Object>} Lambda response
 */
export const handler = async (event) => {
  console.log("📥 Event received:", JSON.stringify(event, null, 2));

  // Get endpoint name from environment variable or event
  const endpointName =
    process.env.SAGEMAKER_ENDPOINT_NAME || event.endpointName;

  if (!endpointName) {
    return {
      statusCode: 400,
      body: JSON.stringify({
        error: "Missing endpoint name",
        message:
          "Provide SAGEMAKER_ENDPOINT_NAME env var or endpointName in event",
      }),
    };
  }

  return invokeIrisEndpoint(endpointName);
};

/**
 * Local testing - Run with: node index.mjs
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const event = { endpointName: process.env.SAGEMAKER_ENDPOINT_NAME };
  handler(event)
    .then((result) => console.log("Result:", JSON.stringify(result, null, 2)))
    .catch((error) => console.error("Error:", error));
}
