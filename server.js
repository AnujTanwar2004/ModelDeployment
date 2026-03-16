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
const AWS_REGION = process.env.AWS_REGION || "ap-south-1";
const SAGEMAKER_ENDPOINT_NAME = process.env.SAGEMAKER_ENDPOINT_NAME;

if (!SAGEMAKER_ENDPOINT_NAME) {
  console.warn(
    "SAGEMAKER_ENDPOINT_NAME is not set. Configure it in your environment before calling /predict.",
  );
}

const runtimeClient = new SageMakerRuntimeClient({
  region: AWS_REGION,
});

app.get("/health", (_req, res) => {
  res.json({ status: "ok", region: AWS_REGION });
});

app.post("/predict", async (req, res) => {
  try {
    if (!SAGEMAKER_ENDPOINT_NAME) {
      return res.status(500).json({
        error: "Missing SAGEMAKER_ENDPOINT_NAME environment variable",
      });
    }

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

    const command = new InvokeEndpointCommand({
      EndpointName: SAGEMAKER_ENDPOINT_NAME,
      ContentType: "application/json",
      Body: JSON.stringify(numericData),
    });

    const response = await runtimeClient.send(command);
    const bodyString = Buffer.from(response.Body).toString("utf-8");

    let prediction;
    try {
      prediction = JSON.parse(bodyString);
    } catch (_err) {
      prediction = bodyString;
    }

    return res.json({ prediction });
  } catch (error) {
    console.error("Prediction error:", error);
    return res.status(500).json({
      error: "Failed to invoke SageMaker endpoint",
      details: error.message,
    });
  }
});

app.listen(PORT, "0.0.0.0" ,  () => {
  console.log(`Server listening on port ${PORT}`);
});
