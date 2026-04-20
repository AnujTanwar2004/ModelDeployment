# Iris Prediction App (Express + SageMaker or Azure ML)

This app provides a simple frontend and a Node.js API that can call either an AWS SageMaker endpoint or an Azure ML online endpoint.

## Project Structure

```
├── server.js                          # Express API (Beanstalk/EC2/Local)
├── lambda/                            # AWS Lambda deployment (isolated)
│   ├── index.mjs                      # Lambda handler function
│   └── LAMBDA_DEPLOYMENT.md           # Lambda setup guide
├── ml/                                # ML model training & deployment
├── public/                            # Frontend files
├── package.json                       # Dependencies
├── Dockerfile                         # For ECS/Fargate deployment
├── deployment.md                      # Deployment guides
└── README.md                          # This file
```

## Architecture

Frontend -> Node API -> SageMaker or Azure ML Endpoint -> Prediction

## 1) Prerequisites

- Node.js 18+
- An existing SageMaker real-time endpoint
- AWS credentials available to the runtime:
  - Local dev: AWS CLI profile or environment credentials
  - AWS deploy: IAM role attached to service (recommended)

## 2) Configure

Copy `.env.example` to `.env` and update values:

```bash
PORT=3000
MODEL_PROVIDER=sagemaker
AWS_REGION=ap-south-1
SAGEMAKER_ENDPOINT_NAME=your-sagemaker-endpoint-name
```

## 3) Run locally

```bash
npm install
npm start
```

Open http://localhost:3000

Health check:

```bash
GET /health
```

Prediction API:

```bash
POST /predict
Content-Type: application/json

{
  "data": [5.1, 3.5, 1.4, 0.2]
}
```

## 4) Deploy options on AWS

### Option A: App Runner (simple)

1. Push this repo to GitHub.
2. Create App Runner service from source repository.
3. Build command: `npm install`
4. Start command: `npm start`
5. Set environment variables:
   - `PORT=3000`
   - `AWS_REGION=ap-south-1`
   - `SAGEMAKER_ENDPOINT_NAME=<your-endpoint>`
6. Attach an IAM role with `sagemaker:InvokeEndpoint` permission.

### Option B: Elastic Beanstalk (Node.js)

1. Create a Node.js Elastic Beanstalk environment.
2. Upload this project.
3. Set environment variables in Beanstalk configuration.
4. Attach instance profile with `sagemaker:InvokeEndpoint` permission.

### Option C: ECS/Fargate using Dockerfile

1. Build container image using the included `Dockerfile`.
2. Push image to ECR.
3. Run in ECS Fargate with env vars and task role permissions.

### Option D: AWS Lambda

For Lambda-specific deployment, see [`lambda/LAMBDA_DEPLOYMENT.md`](lambda/LAMBDA_DEPLOYMENT.md).

**Lambda-specific files are in the `lambda/` folder:**

- `lambda/index.mjs` - Lambda handler function
- `lambda/LAMBDA_DEPLOYMENT.md` - Complete Lambda deployment guide

⚠️ **Important**: Lambda files are isolated and do NOT affect Beanstalk, EC2, or local deployments.

## 5) Required IAM permission

Attach this policy to the compute role (App Runner instance role / EC2 role / ECS task role):

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["sagemaker:InvokeEndpoint"],
      "Resource": "arn:aws:sagemaker:ap-south-1:<ACCOUNT_ID>:endpoint/<ENDPOINT_NAME>"
    }
  ]
}
```

## Notes

- The app expects exactly 4 numeric input values.
- The response from SageMaker is returned as `prediction`.
- If endpoint output is not JSON, the app still returns it as plain text.

## 6) Create and deploy the Iris model to SageMaker

This repo includes code to train and deploy an Iris model endpoint.

### Files

- `ml/train.py`: trains a scikit-learn model and saves `model.joblib`
- `ml/inference.py`: serves predictions from endpoint
- `ml/deploy_iris_model.py`: launches training + endpoint deployment
- `ml/requirements.txt`: Python dependencies for deployment script

### Install Python deps

```bash
pip install -r ml/requirements.txt
```

### Set deploy environment variables

```bash
set AWS_REGION=ap-south-1
set SAGEMAKER_EXECUTION_ROLE_ARN=arn:aws:iam::<ACCOUNT_ID>:role/<SAGEMAKER_EXECUTION_ROLE>
set SAGEMAKER_ENDPOINT_NAME=iris-sklearn-endpoint
```

### Train + deploy endpoint

```bash
python ml/deploy_iris_model.py
```

Optional custom endpoint name:

```bash
python ml/deploy_iris_model.py --endpoint-name my-iris-endpoint
```

After deployment succeeds, set the same endpoint name in your website backend `.env`:

```bash
SAGEMAKER_ENDPOINT_NAME=my-iris-endpoint
```

Then start the website API:

```bash
npm start
```

Your website flow becomes:

Frontend -> Node API (`/predict`) -> SageMaker endpoint (`ml/inference.py`) -> predicted class name

## 7) Deploy with Azure AI/ML service

If you want the same app on Azure, use the notebook:

- `ml/azure_iris_endpoint.ipynb`

This notebook trains Iris, creates an Azure ML managed online endpoint, deploys `score.py`, and prints scoring URI + key.

### Backend settings for Azure ML

Set these variables in `.env` or your hosting environment:

```bash
MODEL_PROVIDER=azureml
AZURE_ML_SCORING_URI=https://<your-endpoint>.<region>.inference.ml.azure.com/score
AZURE_ML_API_KEY=<your-azure-ml-endpoint-key>
AZURE_ML_DEPLOYMENT_NAME=blue
```

### Deploy your Node website to Azure Web App

1. Create a Linux Web App (Node 18+).
2. Deploy code (GitHub Actions, zip deploy, or `az webapp up`).
3. In Web App Configuration, set env vars:

- `PORT=3000`
- `MODEL_PROVIDER=azureml`
- `AZURE_ML_SCORING_URI=...`
- `AZURE_ML_API_KEY=...`
- `AZURE_ML_DEPLOYMENT_NAME=blue`

4. Restart the Web App.

### Optional Azure CLI quick start

```bash
az group create -n <rg> -l <region>
az appservice plan create -g <rg> -n <plan> --is-linux --sku B1
az webapp create -g <rg> -p <plan> -n <app-name> --runtime "NODE|20-lts"
az webapp config appsettings set -g <rg> -n <app-name> --settings PORT=3000 MODEL_PROVIDER=azureml AZURE_ML_SCORING_URI=<uri> AZURE_ML_API_KEY=<key> AZURE_ML_DEPLOYMENT_NAME=blue
az webapp up -g <rg> -n <app-name>
```
