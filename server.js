require("dotenv").config();

const path = require("path");
const express = require("express");
const {
  SageMakerRuntimeClient,
  InvokeEndpointCommand,
} = require("@aws-sdk/client-sagemaker-runtime");

const app = express();
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

const PORT = Number(process.env.PORT || 3000);
const MODEL_PROVIDER = (
  process.env.MODEL_PROVIDER || "sagemaker"
).toLowerCase();
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const SAGEMAKER_ENDPOINT_NAME = process.env.SAGEMAKER_ENDPOINT_NAME;
const AZURE_ML_SCORING_URI = process.env.AZURE_ML_SCORING_URI;
const AZURE_ML_API_KEY = process.env.AZURE_ML_API_KEY;
const AZURE_ML_DEPLOYMENT_NAME = process.env.AZURE_ML_DEPLOYMENT_NAME;

if (!SAGEMAKER_ENDPOINT_NAME) {
  console.warn(
    "SAGEMAKER_ENDPOINT_NAME is not set. Configure it in your environment before calling /predict.",
  );
}

if (
  MODEL_PROVIDER === "azureml" &&
  (!AZURE_ML_SCORING_URI || !AZURE_ML_API_KEY)
) {
  console.warn(
    "MODEL_PROVIDER=azureml but AZURE_ML_SCORING_URI or AZURE_ML_API_KEY is missing.",
  );
}

const runtimeClient = new SageMakerRuntimeClient({
  region: AWS_REGION,
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", provider: MODEL_PROVIDER, region: AWS_REGION });
});

async function invokeSageMaker(numericData) {
  if (!SAGEMAKER_ENDPOINT_NAME) {
    throw new Error("Missing SAGEMAKER_ENDPOINT_NAME environment variable");
  }

  const command = new InvokeEndpointCommand({
    EndpointName: SAGEMAKER_ENDPOINT_NAME,
    ContentType: "application/json",
    Body: JSON.stringify(numericData),
  });

  const response = await runtimeClient.send(command);
  const bodyString = Buffer.from(response.Body).toString("utf-8");

  try {
    return JSON.parse(bodyString);
  } catch (_err) {
    return bodyString;
  }
}

async function invokeAzureML(numericData) {
  if (!AZURE_ML_SCORING_URI || !AZURE_ML_API_KEY) {
    throw new Error(
      "Missing AZURE_ML_SCORING_URI or AZURE_ML_API_KEY environment variable",
    );
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${AZURE_ML_API_KEY}`,
  };

  if (AZURE_ML_DEPLOYMENT_NAME) {
    headers["azureml-model-deployment"] = AZURE_ML_DEPLOYMENT_NAME;
  }

  const response = await fetch(AZURE_ML_SCORING_URI, {
    method: "POST",
    headers,
    body: JSON.stringify({ data: numericData }),
  });

  const text = await response.text();
  if (!response.ok) {
    throw new Error(`Azure ML request failed (${response.status}): ${text}`);
  }

  try {
    return JSON.parse(text);
  } catch (_err) {
    return text;
  }
}

app.post("/predict", async (req, res) => {
  try {
    const data = req.body?.data;

    if (!Array.isArray(data) || data.length !== 4) {
      return res.status(400).json({
        error:
          'Invalid input. Send JSON body like { "data": [5.1, 3.5, 1.4, 0.2] }',
      });
    }

    const numericData = data.map(Number);
    if (numericData.some((n) => Number.isNaN(n))) {
      return res.status(400).json({
        error: "All values in data must be numbers",
      });
    }

    const prediction =
      MODEL_PROVIDER === "azureml"
        ? await invokeAzureML(numericData)
        : await invokeSageMaker(numericData);

    const normalizedPrediction =
      prediction && typeof prediction === "object" && "prediction" in prediction
        ? prediction.prediction
        : prediction;

    return res.json({ prediction: normalizedPrediction });
  } catch (error) {
    console.error("Prediction error:", error);
    return res.status(500).json({
      error:
        MODEL_PROVIDER === "azureml"
          ? "Failed to invoke Azure ML endpoint"
          : "Failed to invoke SageMaker endpoint",
      details: error.message,
    });
  }
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server listening on port ${PORT}`);
});
