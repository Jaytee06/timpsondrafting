import {
  ChangeMessageVisibilityCommand,
  DeleteMessageCommand,
  ReceiveMessageCommand,
  SendMessageCommand,
  SQSClient,
} from '@aws-sdk/client-sqs';
import { env } from './env.mjs';

const client = new SQSClient({});

export const enqueueChatJob = (job) =>
  client.send(
    new SendMessageCommand({
      QueueUrl: env.chatQueueUrl,
      MessageBody: JSON.stringify(job),
    })
  );

export const receiveChatJob = async () => {
  const response = await client.send(
    new ReceiveMessageCommand({
      QueueUrl: env.chatQueueUrl,
      AttributeNames: ['ApproximateReceiveCount'],
      MaxNumberOfMessages: 1,
      WaitTimeSeconds: 15,
      VisibilityTimeout: 120,
    })
  );

  const [message] = response.Messages || [];
  if (!message) {
    return null;
  }

  return {
    receiptHandle: message.ReceiptHandle,
    approximateReceiveCount: Number(message.Attributes?.ApproximateReceiveCount || 1),
    job: JSON.parse(message.Body || '{}'),
  };
};

export const deleteChatJob = (receiptHandle) =>
  client.send(
    new DeleteMessageCommand({
      QueueUrl: env.chatQueueUrl,
      ReceiptHandle: receiptHandle,
    })
  );

export const requeueChatJob = (receiptHandle) =>
  client.send(
    new ChangeMessageVisibilityCommand({
      QueueUrl: env.chatQueueUrl,
      ReceiptHandle: receiptHandle,
      VisibilityTimeout: 0,
    })
  );
