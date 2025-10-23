#!/bin/bash

# AWS SQS Setup Script for SmartPapers Submission Queue
# This script creates the necessary SQS queues for the submission system

set -e

echo "🚀 SmartPapers SQS Setup Script"
echo "================================"
echo ""

# Check if AWS CLI is installed
if ! command -v aws &> /dev/null; then
    echo "❌ AWS CLI is not installed. Please install it first:"
    echo "   https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html"
    exit 1
fi

# Check if AWS credentials are configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS credentials not configured. Run: aws configure"
    exit 1
fi

echo "✅ AWS CLI is configured"
echo ""

# Get AWS region (default to us-east-1)
read -p "Enter AWS region [us-east-1]: " AWS_REGION
AWS_REGION=${AWS_REGION:-us-east-1}

# Queue names
MAIN_QUEUE_NAME="smartpapers-submission-queue"
DLQ_NAME="smartpapers-submission-dlq"

echo ""
echo "📦 Creating Dead Letter Queue: $DLQ_NAME"

# Create Dead Letter Queue
DLQ_URL=$(aws sqs create-queue \
    --queue-name "$DLQ_NAME" \
    --region "$AWS_REGION" \
    --attributes MessageRetentionPeriod=1209600 \
    --query 'QueueUrl' \
    --output text)

echo "✅ Dead Letter Queue created: $DLQ_URL"

# Get DLQ ARN
DLQ_ARN=$(aws sqs get-queue-attributes \
    --queue-url "$DLQ_URL" \
    --attribute-names QueueArn \
    --region "$AWS_REGION" \
    --query 'Attributes.QueueArn' \
    --output text)

echo ""
echo "📦 Creating Main Queue: $MAIN_QUEUE_NAME"

# Create main queue with DLQ redrive policy
QUEUE_URL=$(aws sqs create-queue \
    --queue-name "$MAIN_QUEUE_NAME" \
    --region "$AWS_REGION" \
    --attributes "{
        \"VisibilityTimeout\": \"300\",
        \"MessageRetentionPeriod\": \"345600\",
        \"ReceiveMessageWaitTimeSeconds\": \"20\",
        \"RedrivePolicy\": \"{\\\"deadLetterTargetArn\\\":\\\"$DLQ_ARN\\\",\\\"maxReceiveCount\\\":\\\"3\\\"}\"
    }" \
    --query 'QueueUrl' \
    --output text)

echo "✅ Main Queue created: $QUEUE_URL"

echo ""
echo "🔐 Creating IAM Policy"

# Create IAM policy
POLICY_NAME="SmartPapersSubmissionQueuePolicy"
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

POLICY_DOCUMENT=$(cat <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:DeleteMessage",
        "sqs:GetQueueAttributes",
        "sqs:GetQueueUrl"
      ],
      "Resource": [
        "arn:aws:sqs:$AWS_REGION:$ACCOUNT_ID:$MAIN_QUEUE_NAME",
        "arn:aws:sqs:$AWS_REGION:$ACCOUNT_ID:$DLQ_NAME"
      ]
    }
  ]
}
EOF
)

POLICY_ARN=$(aws iam create-policy \
    --policy-name "$POLICY_NAME" \
    --policy-document "$POLICY_DOCUMENT" \
    --query 'Policy.Arn' \
    --output text 2>/dev/null || echo "")

if [ -z "$POLICY_ARN" ]; then
    # Policy might already exist, get its ARN
    POLICY_ARN="arn:aws:iam::$ACCOUNT_ID:policy/$POLICY_NAME"
    echo "⚠️  Policy already exists: $POLICY_ARN"
else
    echo "✅ Policy created: $POLICY_ARN"
fi

echo ""
echo "👤 Creating IAM User"

IAM_USER_NAME="smartpapers-sqs-user"

# Create IAM user
aws iam create-user --user-name "$IAM_USER_NAME" 2>/dev/null || echo "⚠️  User already exists"

# Attach policy to user
aws iam attach-user-policy \
    --user-name "$IAM_USER_NAME" \
    --policy-arn "$POLICY_ARN"

echo "✅ Policy attached to user: $IAM_USER_NAME"

echo ""
echo "🔑 Creating Access Keys"

# Create access keys
ACCESS_KEY_OUTPUT=$(aws iam create-access-key --user-name "$IAM_USER_NAME" --output json)
ACCESS_KEY_ID=$(echo "$ACCESS_KEY_OUTPUT" | grep -o '"AccessKeyId": "[^"]*' | grep -o '[^"]*$')
SECRET_ACCESS_KEY=$(echo "$ACCESS_KEY_OUTPUT" | grep -o '"SecretAccessKey": "[^"]*' | grep -o '[^"]*$')

echo "✅ Access keys created"

echo ""
echo "=========================================="
echo "✅ Setup Complete!"
echo "=========================================="
echo ""
echo "Add these to your backend/.env file:"
echo ""
echo "AWS_REGION=$AWS_REGION"
echo "AWS_ACCESS_KEY_ID=$ACCESS_KEY_ID"
echo "AWS_SECRET_ACCESS_KEY=$SECRET_ACCESS_KEY"
echo "SQS_QUEUE_URL=$QUEUE_URL"
echo ""
echo "⚠️  IMPORTANT: Save these credentials securely!"
echo "⚠️  The secret access key cannot be retrieved again."
echo ""
echo "Queue URLs:"
echo "  Main Queue: $QUEUE_URL"
echo "  Dead Letter Queue: $DLQ_URL"
echo ""
echo "Next steps:"
echo "  1. Update backend/.env with the variables above"
echo "  2. Start the API server: npm start"
echo "  3. Start worker process: npm run worker"
echo ""
