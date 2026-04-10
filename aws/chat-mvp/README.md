# Chat MVP AWS Scaffold

This scaffold is now designed for the simplest path you can deploy in your own AWS account:

- browser calls Lambda Function URLs over HTTP,
- `chat-send` writes the visitor message to DynamoDB and places a job on SQS,
- the private Mac bridge claims jobs through a separate Function URL,
- `bridge-heartbeat` writes bridge availability into DynamoDB,
- `bridge-complete` writes the assistant reply to DynamoDB,
- browser polls `chat-poll` for the updated transcript.

## Why This Cut

This version avoids API Gateway setup entirely and uses only:

- Lambda Function URLs
- SQS
- DynamoDB

That is a better fit when you do not have access to create API Gateway resources in the primary business account and want the smallest self-managed pilot.

## Required AWS Resources

1. DynamoDB table
   Suggested name: `timpson-drafting-chat`
2. SQS queue
   Suggested name: `timpson-drafting-chat-jobs`
3. Lambda functions with Function URLs
   - `chat-send`
   - `chat-poll`
   - `bridge-claim`
   - `bridge-heartbeat`
   - `bridge-complete`
   - `bridge-fail`
4. IAM roles/policies
   - SQS access for enqueue/claim/fail/delete
   - DynamoDB access for transcript reads/writes
5. Secrets/config
   - `BRIDGE_SHARED_SECRET`

## Browser Contract

Browser -> `chat-send`:

```json
{
  "type": "send.request",
  "sessionId": "uuid",
  "createdAt": "2026-04-08T12:00:00.000Z",
  "payload": {
    "requestId": "uuid",
    "text": "I need plans for a garage addition.",
    "pageUrl": "https://www.timpsondrafting.com/",
    "referrer": "https://google.com/",
    "userAgent": "Mozilla/5.0 ...",
    "transcript": [
      {
        "sender": "visitor",
        "text": "I need plans for a garage addition.",
        "createdAt": "2026-04-08T12:00:00.000Z"
      }
    ]
  }
}
```

Browser -> `chat-poll`:

```json
{
  "sessionId": "uuid"
}
```

`chat-poll` -> Browser:

```json
{
  "type": "poll.response",
  "sessionId": "uuid",
  "createdAt": "2026-04-08T12:00:05.000Z",
  "payload": {
    "messages": [
      {
        "id": "msg-1",
        "sender": "visitor",
        "text": "I need plans for a garage addition.",
        "createdAt": "2026-04-08T12:00:00.000Z"
      },
      {
        "id": "msg-2",
        "sender": "assistant",
        "text": "What size garage are you planning?",
        "createdAt": "2026-04-08T12:00:03.000Z"
      }
    ],
    "bridge": {
      "available": true,
      "status": "online",
      "workerId": "office-mac",
      "updatedAt": "2026-04-08T12:00:04.000Z",
      "commandSource": "/opt/homebrew/bin/codex",
      "message": "Local bridge is available."
    }
  }
}
```

## Bridge Contract

`bridge-claim` response:

```json
{
  "job": {
    "jobId": "job-123",
    "sessionId": "session-123",
    "receiptHandle": "sqs-receipt-handle",
    "createdAt": "2026-04-08T12:00:00.000Z",
    "leadContext": {
      "pageUrl": "https://www.timpsondrafting.com/"
    },
    "transcript": [
      {
        "sender": "visitor",
        "text": "I need plans for a garage addition.",
        "createdAt": "2026-04-08T12:00:00.000Z"
      }
    ]
  }
}
```

`bridge-complete` request:

```json
{
  "workerId": "office-mac",
  "receiptHandle": "sqs-receipt-handle",
  "sessionId": "session-123",
  "leadContext": {
    "pageUrl": "https://www.timpsondrafting.com/"
  },
  "replyText": "What size garage are you planning?"
}
```

`bridge-heartbeat` request:

```json
{
  "workerId": "office-mac",
  "status": "online",
  "statusMessage": "Local bridge is online via /opt/homebrew/bin/codex.",
  "commandSource": "/opt/homebrew/bin/codex",
  "updatedAt": "2026-04-08T12:00:04.000Z"
}
```

## Environment Variables

Lambda functions:

- `CHAT_TABLE_NAME`
- `CHAT_QUEUE_URL`
- `CHAT_TTL_SECONDS`
- `BRIDGE_HEARTBEAT_TTL_SECONDS`
- `BRIDGE_SHARED_SECRET`

Frontend:

- `VITE_CHAT_SEND_URL`
- `VITE_CHAT_POLL_URL`

Mac bridge:

- `BRIDGE_CLAIM_URL`
- `BRIDGE_COMPLETE_URL`
- `BRIDGE_FAIL_URL`
- `BRIDGE_HEARTBEAT_URL`
- `BRIDGE_SHARED_SECRET`
- `BRIDGE_WORKER_ID`
- optional `CODEX_COMMAND`

## Install Dependencies

The AWS packaging scripts have their own dependencies under `aws/chat-mvp/package.json`.

Install them from `aws/chat-mvp`:

```bash
cd /Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/aws/chat-mvp
source ~/.nvm/nvm.sh
nvm use 20.14
npm install
```

This install is for:

- Lambda bundling
- Lambda zipping
- local packaging of `node_modules` into the generated function folders

It is separate from the root project install used by the frontend and local bridge.

## Package Lambdas

From `aws/chat-mvp`:

```bash
cd /Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/aws/chat-mvp
source ~/.nvm/nvm.sh
nvm use 20.14
npm run prepare:lambdas
```

If you want zip files for upload:

```bash
cd /Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/aws/chat-mvp
source ~/.nvm/nvm.sh
nvm use 20.14
npm run zip:lambdas
```

## Data Model

DynamoDB single-table layout:

- Session meta
  `PK=SESSION#<sessionId>`
  `SK=META`
- Transcript messages
  `PK=SESSION#<sessionId>`
  `SK=MESSAGE#<timestamp>#<messageId>`
- Bridge worker heartbeat
  `PK=BRIDGE`
  `SK=WORKER#<workerId>`

SQS holds only pending local-agent work. DynamoDB holds the transcript that the browser polls.
