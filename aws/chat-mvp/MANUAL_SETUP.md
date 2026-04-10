# Manual AWS Setup Checklist

This checklist is for the refactored pilot architecture:

- static landing page stays on S3/CloudFront,
- browser uses Lambda Function URLs instead of API Gateway,
- `chat-send` stores visitor messages in DynamoDB and enqueues work to SQS,
- the private Mac bridge claims work from a separate Function URL,
- `bridge-heartbeat` stores bridge availability in DynamoDB,
- `bridge-complete` stores the assistant reply in DynamoDB,
- browser polls `chat-poll` every few seconds for the updated transcript.

## Architecture At A Glance

1. Visitor opens the landing page.
2. Browser posts to `chat-send`.
3. `chat-send` writes the visitor message to DynamoDB.
4. `chat-send` places a pending job on SQS.
5. Your Mac bridge calls `bridge-claim`.
6. The bridge runs the local Codex workflow.
7. The bridge publishes `bridge-heartbeat` updates while it is online.
8. The bridge calls `bridge-complete`.
9. `bridge-complete` writes the assistant reply to DynamoDB.
10. Browser polling to `chat-poll` sees the new assistant reply and bridge status.

## Values To Decide Before Starting

- AWS region
  Example: `us-west-2`
- DynamoDB table name
  Example: `timpson-drafting-chat`
- SQS queue name
  Example: `timpson-drafting-chat-jobs`
- transcript retention TTL
  Example: `604800` seconds (7 days)
- bridge shared secret
  Example: a long random string stored safely

## Resource 1: Create The DynamoDB Table

In AWS Console:

1. Open `DynamoDB`.
2. Click `Create table`.
3. Table name: `timpson-drafting-chat`
4. Partition key: `PK` type `String`
5. Sort key: `SK` type `String`
6. Keep default settings or use on-demand capacity for simplicity.
7. Create the table.

No GSIs are required for this pilot.

## Resource 2: Create The SQS Queue

In AWS Console:

1. Open `SQS`.
2. Click `Create queue`.
3. Choose `Standard`.
4. Name it `timpson-drafting-chat-jobs`.
5. Leave defaults unless you need different retention.
6. Create the queue.
7. Copy the queue URL.

You will use this as `CHAT_QUEUE_URL`:
https://sqs.us-west-2.amazonaws.com/197701154957/timpson-drafting-chat-jobs

## Resource 3: Create The Lambda Functions

Create 6 Lambda functions in the same region.

Suggested names:

- `timpson-drafting-chat-send`
- `timpson-drafting-chat-poll`
- `timpson-drafting-chat-bridge-claim`
- `timpson-drafting-chat-bridge-heartbeat`
- `timpson-drafting-chat-bridge-complete`
- `timpson-drafting-chat-bridge-fail`

Suggested runtime:

- `Node.js 20.x`

Why Node 20:

- supports `fetch`
- supports modern `crypto`
- matches the code in this repo
- avoids the older local runtime issues already seen here

## Lambda Code Mapping

Use these handler files:

- [chat-send.mjs](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/aws/chat-mvp/handlers/chat-send.mjs)
- [chat-poll.mjs](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/aws/chat-mvp/handlers/chat-poll.mjs)
- [bridge-claim.mjs](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/aws/chat-mvp/handlers/bridge-claim.mjs)
- [bridge-heartbeat.mjs](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/aws/chat-mvp/handlers/bridge-heartbeat.mjs)
- [bridge-complete.mjs](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/aws/chat-mvp/handlers/bridge-complete.mjs)
- [bridge-fail.mjs](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/aws/chat-mvp/handlers/bridge-fail.mjs)

Include these shared helper files in each deployment package:

- [auth.mjs](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/aws/chat-mvp/handlers/lib/auth.mjs)
- [db.mjs](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/aws/chat-mvp/handlers/lib/db.mjs)
- [env.mjs](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/aws/chat-mvp/handlers/lib/env.mjs)
- [http.mjs](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/aws/chat-mvp/handlers/lib/http.mjs)
- [sqs.mjs](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/aws/chat-mvp/handlers/lib/sqs.mjs)

## Zip-Ready Packaging

If you want uploadable Lambda folders from this repo:

1. Open a terminal in `aws/chat-mvp`
2. Run `npm install`
3. Run `npm run prepare:lambdas`

That creates per-function folders in `aws/chat-mvp/dist/`.

If you also want zip files:

1. Make sure the `zip` command exists on your machine
2. Run `npm run zip:lambdas`

That creates one zip inside each function folder in `aws/chat-mvp/dist/`.

Each generated folder contains:

- `index.mjs`
- `lib/`
- `package.json`
- `node_modules/` if installed locally first

## Lambda Environment Variables

Set these on every Lambda:

- `CHAT_TABLE_NAME`
- `CHAT_QUEUE_URL`
- `CHAT_TTL_SECONDS`
- `BRIDGE_HEARTBEAT_TTL_SECONDS`
- `BRIDGE_SHARED_SECRET`

Example values:

- `CHAT_TABLE_NAME=timpson-drafting-chat`
- `CHAT_QUEUE_URL=https://sqs.us-west-2.amazonaws.com/123456789012/timpson-drafting-chat-jobs`
- `CHAT_TTL_SECONDS=604800`
- `BRIDGE_HEARTBEAT_TTL_SECONDS=60`
- `BRIDGE_SHARED_SECRET=replace-with-a-long-random-secret`

## Lambda IAM Permissions

Practical minimum permissions:

- `chat-send`
  Needs `dynamodb:PutItem`, `dynamodb:UpdateItem`, `sqs:SendMessage`
- `chat-poll`
  Needs `dynamodb:Query`
- `bridge-claim`
  Needs `sqs:ReceiveMessage`
- `bridge-heartbeat`
  Needs `dynamodb:PutItem`
- `bridge-complete`
  Needs `dynamodb:PutItem`, `dynamodb:UpdateItem`, `sqs:DeleteMessage`
- `bridge-fail`
  Needs `sqs:ChangeMessageVisibility`

If your boss prefers broader but simpler permissions during setup, that is fine for the pilot, but these are the minimum categories.

## Resource 4: Enable Function URLs

For each Lambda:

1. Open the Lambda.
2. Go to `Configuration`.
3. Open `Function URL`.
4. Click `Create function URL`.
5. Auth type:
   - `NONE` for `chat-send` and `chat-poll`
   - `NONE` is also acceptable for the bridge endpoints because the code checks `x-bridge-secret`
6. Configure CORS for browser-facing functions:
   - apply to `chat-send`
   - apply to `chat-poll`

Recommended CORS settings for `chat-send` and `chat-poll`:

- allowed origin: your landing-page domain
- allowed methods: `POST`
- allowed headers: `content-type`

After each Function URL is created, copy the URL.

You will need:

- `chat-send` Function URL
- `chat-poll` Function URL
- `bridge-claim` Function URL
- `bridge-heartbeat` Function URL
- `bridge-complete` Function URL
- `bridge-fail` Function URL

## Frontend Configuration

Before building the site locally:

1. Set `VITE_CHAT_SEND_URL`
2. Set `VITE_CHAT_POLL_URL`
3. Build the frontend
4. Upload the new `dist/` files to S3 as usual

Example:

```bash
VITE_CHAT_SEND_URL=https://abc123.lambda-url.us-west-2.on.aws/
VITE_CHAT_POLL_URL=https://def456.lambda-url.us-west-2.on.aws/
```

Files involved:

- [ChatWidget.tsx](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/src/components/ChatWidget.tsx)
- [useChatConnection.ts](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/src/chat/useChatConnection.ts)

## Mac Bridge Configuration

Before running the bridge:

1. Set `BRIDGE_CLAIM_URL`
2. Set `BRIDGE_HEARTBEAT_URL`
3. Set `BRIDGE_COMPLETE_URL`
4. Set `BRIDGE_FAIL_URL`
5. Set `BRIDGE_SHARED_SECRET`
6. Set `BRIDGE_WORKER_ID`
7. Optionally set `CODEX_COMMAND`
8. Run `npm run bridge`

Example:

```bash
export BRIDGE_CLAIM_URL=https://claim123.lambda-url.us-west-2.on.aws/
export BRIDGE_HEARTBEAT_URL=https://heartbeat123.lambda-url.us-west-2.on.aws/
export BRIDGE_COMPLETE_URL=https://complete123.lambda-url.us-west-2.on.aws/
export BRIDGE_FAIL_URL=https://fail123.lambda-url.us-west-2.on.aws/
export BRIDGE_SHARED_SECRET=replace-with-a-long-random-secret
export BRIDGE_WORKER_ID=office-mac
export CODEX_COMMAND='your-local-codex-command'
npm run bridge
```

Files involved:

- [worker.mjs](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/local-bridge/worker.mjs)
- [agent-adapter.mjs](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/local-bridge/agent-adapter.mjs)
- [prompt-builder.mjs](/Users/toxicutie/Desktop/work/TimpsonDrafting/timpsondrafting/local-bridge/prompt-builder.mjs)

## Test Flow

1. Open the landing page.
2. Open the chat widget.
3. Send a test message.
4. Confirm `chat-send` Lambda runs.
5. Confirm a DynamoDB visitor message item appears.
6. Confirm an SQS message appears briefly.
7. Confirm the Mac bridge claims the job.
8. Confirm `bridge-heartbeat` writes a bridge worker item to DynamoDB.
9. Confirm `bridge-complete` writes an assistant message to DynamoDB.
10. Confirm the browser sees the reply on the next poll.

## First Debug Checks

If the browser sends but no assistant reply ever appears:

- check `chat-send` Lambda logs
- check `chat-poll` Lambda logs
- check `bridge-claim` Lambda logs
- check `bridge-complete` Lambda logs
- confirm the SQS queue is receiving messages
- confirm the DynamoDB table is receiving transcript items

If the bridge never gets work:

- confirm `CHAT_QUEUE_URL` is correct
- confirm `bridge-claim` has `sqs:ReceiveMessage`
- confirm the bridge shared secret matches exactly
- confirm the Mac can reach the three bridge Function URLs

If browser polling works but messages never change:

- confirm `bridge-complete` is writing assistant messages into DynamoDB
- confirm `chat-poll` has `dynamodb:Query`
- confirm the table name matches `CHAT_TABLE_NAME`

## Recommended Pilot Scope

Keep the first live pilot narrow:

- anonymous visitors are fine
- one DynamoDB table
- one SQS queue
- five Lambda functions
- one private Mac bridge worker
- no EC2 yet

If the pilot works, the likely next upgrades are:

- tighter auth and rate limits
- summarized lead records alongside transcript records
- hosted worker instead of Mac-only bridge
- CRM handoff automation
