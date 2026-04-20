# Lambda Function Deployment Guide

## ⚠️ Important: Deployment-Specific Configuration

This guide is **ONLY for AWS Lambda** deployment. Lambda files are isolated in the `lambda/` folder.

**Deployment File Locations:**

| File                         | Deployment Type       | Purpose                                       |
| ---------------------------- | --------------------- | --------------------------------------------- |
| `lambda/index.mjs`           | **AWS Lambda Only**   | Lambda handler entry point                    |
| `lambda-invoke-endpoint.mjs` | Beanstalk, EC2, Local | Development file (do NOT use for Lambda)      |
| `server.js`                  | Beanstalk, EC2, Local | Express web server (do NOT modify for Lambda) |

**Do NOT modify `server.js` or `lambda-invoke-endpoint.mjs` for Lambda deployment.**

## Overview

This Lambda function invokes the SageMaker Iris endpoint with dummy test values to verify endpoint accessibility and functionality.

**Lambda Files (in this folder):**

- `index.mjs` - Lambda handler (unique to Lambda deployment)

- **Runtime:** Node.js 20.x
- **Architecture:** ES6 modules (.mjs)
- **Handler:** `index.handler`

## Features

✅ Tests SageMaker endpoint with dummy iris data  
✅ Supports Node 20 runtime  
✅ Uses AWS SDK v3 (modular)  
✅ Comprehensive logging and error handling  
✅ Can run locally for testing

## Dummy Test Data

The function includes three sample iris measurements representing each species:

```
- Setosa: [5.0, 3.4, 1.5, 0.2]
- Versicolor: [5.9, 2.7, 4.2, 1.3]
- Virginica: [6.7, 3.0, 5.5, 2.0]
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install @aws-sdk/client-sagemaker-runtime
```

### 2. Create Lambda Function (AWS Console)

- **Function name:** `iris-endpoint-invoker`
- **Runtime:** Node.js 20.x
- **Handler:** `index.handler`
- **Code:** Copy the contents of `index.mjs` into the function code editor (or upload as zip)

### 3. Set Environment Variable

Add to Lambda environment variables:

```
SAGEMAKER_ENDPOINT_NAME = iris-endpoint-YYYYMMDDHHMMSS
```

(Replace with your actual endpoint name from SageMaker)

### 4. Set IAM Permissions

Add inline policy to Lambda execution role:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "sagemaker:InvokeEndpoint",
      "Resource": "arn:aws:sagemaker:*:ACCOUNT-ID:endpoint/iris-endpoint-*"
    }
  ]
}
```

Replace `ACCOUNT-ID` with your AWS account ID.

## Usage

### Via AWS Lambda Console

1. Go to Function > Test
2. Create a test event with:

```json
{
  "endpointName": "iris-endpoint-YYYYMMDDHHMMSS"
}
```

3. Click "Test" to invoke

### Local Testing

```bash
cd lambda/
SAGEMAKER_ENDPOINT_NAME="iris-endpoint-YYYYMMDDHHMMSS" node index.mjs
```

### Via API Gateway

Create an HTTP trigger pointing to this Lambda function and call:

```bash
curl -X POST https://your-api-gateway-url/invoke \
  -H "Content-Type: application/json" \
  -d '{"endpointName": "iris-endpoint-YYYYMMDDHHMMSS"}'
```

## Response Format

### Success (200)

```json
{
  "statusCode": 200,
  "body": {
    "message": "Successfully invoked iris endpoint",
    "predictions": {
      "prediction": ["setosa", "versicolor", "virginica"]
    },
    "timestamp": "2026-03-24T12:00:00.000Z"
  }
}
```

### Error (500)

```json
{
  "statusCode": 500,
  "body": {
    "error": "Failed to invoke iris endpoint",
    "message": "Endpoint not found"
  }
}
```

## Node 20 & .mjs Compatibility

- Uses ES6 module syntax (`import`/`export`)
- AWS SDK v3 with tree-shaking support
- Native `fetch` and `TextDecoder` APIs
- Async/await support
- Compatible with modern Node runtime

## Troubleshooting

**"Endpoint not found"**

- Verify endpoint is deployed in SageMaker
- Check `SAGEMAKER_ENDPOINT_NAME` environment variable is set correctly

**"Access Denied"**

- Verify IAM role has `sagemaker:InvokeEndpoint` permission
- Check endpoint ARN matches the IAM policy

**"Region not found"**

- Ensure Lambda is in the same region as SageMaker endpoint
- Or set `AWS_REGION` environment variable

## Dependencies

- `@aws-sdk/client-sagemaker-runtime` - AWS SageMaker Runtime client for Node 20

## Author Notes

This function is designed for:

- Testing endpoint availability
- Integration testing in CI/CD pipelines
- Debugging endpoint response format
- Load testing with consistent dummy data

---

## ⚠️ Critical: Multi-Deployment Safe Practices

**To ensure Lambda changes don't affect Beanstalk, EC2, or Local deployments:**

### ✅ DO:

- **Modify ONLY `index.mjs`** for Lambda-specific changes
- Keep `server.js` and `lambda-invoke-endpoint.mjs` untouched
- Create separate Lambda-specific environment variables if needed

### ❌ DON'T:

- Modify `server.js` or `lambda-invoke-endpoint.mjs` for Lambda fixes
- Change shared configuration that affects other deployment types
- Mix Lambda handler code with Express server code
- Update `package.json` dependencies without testing all deployment types

### Deployment Independence:

- **Lambda**: `index.mjs` → Handler: `index.handler`
- **Beanstalk/EC2**: `server.js` → Express app on port 3000
- **Local Dev**: `npm start` runs `server.js` via Express

Each deployment type is isolated and does not require changes to the others.
