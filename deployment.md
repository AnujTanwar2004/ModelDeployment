# SageMaker Model + EC2 Web App Deployment

This document explains how to deploy a machine learning model using **Amazon SageMaker** and connect it to a **Node.js website hosted on AWS EC2**.

The system performs Iris flower classification.

---

# Architecture

```
User Browser
      │
      ▼
EC2 Node.js Web Server
      │
      ▼
AWS SageMaker Endpoint
      │
      ▼
ML Model Prediction
```

---

# Part 1 — Create the Model in SageMaker

## 1 Open SageMaker Notebook

Go to:

```
AWS Console → SageMaker → Notebook / Studio
```

Create a new notebook instance.

---

## 2 Install Required Libraries

```python
import boto3
import sagemaker
from sagemaker.sklearn.estimator import SKLearn
```

---

## 3 Train the Model

Create `train.py`.

```python
from sklearn.datasets import load_iris
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
import joblib
import os

iris = load_iris()
X = iris.data
y = iris.target

X_train, X_test, y_train, y_test = train_test_split(X, y)

model = LogisticRegression(max_iter=400)
model.fit(X_train, y_train)

model_dir = os.environ.get("SM_MODEL_DIR")
joblib.dump(model, os.path.join(model_dir, "model.joblib"))
```

---

## 4 Create Inference Script

Create `inference.py`.

```python
import joblib
import json
import os
import numpy as np

def model_fn(model_dir):
    model = joblib.load(os.path.join(model_dir, "model.joblib"))
    return model

def input_fn(request_body, request_content_type):
    data = json.loads(request_body)
    return np.array([data])

def predict_fn(input_data, model):
    prediction = model.predict(input_data)
    return prediction.tolist()

def output_fn(prediction, accept):
    return json.dumps({"prediction": prediction})
```

---

## 5 Train the Model in SageMaker

```python
role = sagemaker.get_execution_role()

estimator = SKLearn(
    entry_point="train.py",
    framework_version="1.2-1",
    instance_type="ml.m5.large",
    role=role
)

estimator.fit()
```

---

## 6 Deploy the Endpoint

```python
predictor = estimator.deploy(
    initial_instance_count=1,
    instance_type="ml.m5.large"
)
```

After deployment SageMaker creates an **endpoint**.

Example:

```
iris-endpoint-20260316
```

---

## 7 Test the Endpoint

```python
predictor.predict([5.1,3.5,1.4,0.2])
```

Expected output:

```
{"prediction":"setosa"}
```

---

# Part 2 — Deploy Website on EC2

## 1 Launch EC2 Instance

Settings:

| Setting        | Value                    |
| -------------- | ------------------------ |
| AMI            | Amazon Linux 2023        |
| Instance type  | t2.micro                 |
| Security group | Allow ports 22, 80, 3000 |

Inbound rules:

| Type       | Port |
| ---------- | ---- |
| SSH        | 22   |
| HTTP       | 80   |
| Custom TCP | 3000 |

---

## 2 Connect to EC2

```bash
ssh -i key.pem ec2-user@EC2_PUBLIC_IP
```

---

## 3 Install Node.js

```bash
sudo dnf update -y
sudo dnf install nodejs git -y
```

Verify installation:

```bash
node -v
npm -v
```

---

## 4 Clone the Project

```bash
git clone https://github.com/yourusername/iris-sagemaker-web.git
cd iris-sagemaker-web
```

---

## 5 Install Dependencies

```bash
npm install
```

---

## 6 Configure Environment Variables

Create `.env`.

```env
PORT=3000
AWS_REGION=ap-south-1
SAGEMAKER_ENDPOINT_NAME=iris-endpoint-xxxx
AWS_ACCESS_KEY_ID=YOUR_KEY
AWS_SECRET_ACCESS_KEY=YOUR_SECRET
```

---

## 7 Start the Server

```bash
node server.js
```

Expected output:

```
Server listening on port 3000
```

---

## 8 Access the Website

Open browser:

```
http://EC2_PUBLIC_IP:3000
```

---

# Part 3 — API Flow

1. User enters flower measurements.
2. Frontend sends request to Node API.

Example request:

```
POST /predict
```

Body:

```json
{
 "data": [5.1,3.5,1.4,0.2]
}
```

3. Node server calls SageMaker endpoint.

4. SageMaker returns prediction.

Example response:

```json
{
 "prediction": "setosa"
}
```

5. Website displays the predicted species.

---

# Useful Commands

Start server:

```
node server.js
```

Restart server:

```
pm2 restart server
```

Check logs:

```
pm2 logs
```

---

# Clean Up (Avoid AWS Charges)

Delete endpoint after testing.

```python
predictor.delete_endpoint()
predictor.delete_model()
```

---

# Conclusion

This project demonstrates:

* Training a model in **Amazon SageMaker**
* Deploying a real-time inference endpoint
* Hosting a **Node.js web application on EC2**
* Calling the SageMaker API from the website
* Displaying predictions to the user

The architecture integrates **Machine Learning with Cloud Web Deployment** using AWS services.
