import {
  DynamoDBClient,
} from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
  UpdateCommand,
} from '@aws-sdk/lib-dynamodb';
import { env } from './env.mjs';

const client = new DynamoDBClient({});
const doc = DynamoDBDocumentClient.from(client);
const bridgePartitionKey = 'BRIDGE';

export const putTranscriptMessage = ({ sessionId, message }) =>
  doc.send(
    new PutCommand({
      TableName: env.chatTableName,
      Item: {
        PK: `SESSION#${sessionId}`,
        SK: `MESSAGE#${message.createdAt}#${message.id}`,
        entityType: 'message',
        sessionId,
        ...message,
        ttl: Math.floor(Date.now() / 1000) + env.chatTtlSeconds,
      },
    })
  );

export const updateSessionMeta = ({ sessionId, updatedAt, leadContext = {} }) =>
  doc.send(
    new UpdateCommand({
      TableName: env.chatTableName,
      Key: {
        PK: `SESSION#${sessionId}`,
        SK: 'META',
      },
      UpdateExpression:
        'SET updatedAt = :updatedAt, leadContext = :leadContext, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#ttl': 'ttl',
      },
      ExpressionAttributeValues: {
        ':updatedAt': updatedAt,
        ':leadContext': leadContext,
        ':ttl': Math.floor(Date.now() / 1000) + env.chatTtlSeconds,
      },
    })
  );

export const listSessionMessages = async (sessionId) => {
  const result = await doc.send(
    new QueryCommand({
      TableName: env.chatTableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `SESSION#${sessionId}`,
        ':sk': 'MESSAGE#',
      },
    })
  );

  return (result.Items || [])
    .map((item) => ({
      id: item.id,
      sender: item.sender,
      text: item.text,
      createdAt: item.createdAt,
    }))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
};

export const putBridgeHeartbeat = ({
  workerId,
  status,
  updatedAt,
  statusMessage = '',
  commandSource = 'unknown',
}) =>
  doc.send(
    new PutCommand({
      TableName: env.chatTableName,
      Item: {
        PK: bridgePartitionKey,
        SK: `WORKER#${workerId}`,
        entityType: 'bridge-worker',
        workerId,
        status,
        statusMessage,
        commandSource,
        updatedAt,
        ttl:
          Math.floor(new Date(updatedAt).getTime() / 1000) + env.bridgeHeartbeatTtlSeconds,
      },
    })
  );

export const listBridgeWorkers = async () => {
  const result = await doc.send(
    new QueryCommand({
      TableName: env.chatTableName,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': bridgePartitionKey,
        ':sk': 'WORKER#',
      },
    })
  );

  return (result.Items || [])
    .map((item) => ({
      workerId: item.workerId,
      status: item.status,
      statusMessage: item.statusMessage,
      commandSource: item.commandSource,
      updatedAt: item.updatedAt,
      ttl: Number(item.ttl || 0),
    }))
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
};
