import type { AzureFunction, Context } from '@azure/functions';
import { QueueServiceClient } from '@azure/storage-queue';
import axios from 'axios';
import { config } from '../config';

const timerTrigger: AzureFunction = async function (
  context: Context,
): Promise<void> {
  process.env['NODE_TLS_REJECT_UNAUTHORIZED'] = 0 as any;

  context.log('✉️ Sending data to Splunk');

  const queueServiceClient = QueueServiceClient.fromConnectionString(
    process.env.AzureWebJobsStorage,
  );
  const queueClient = queueServiceClient.getQueueClient(
    'splunk-send-queue',
  );
  // 32 is the max number of messages that is possiable to poll
  const maxNumberOfMessages = 32;
  let receivedMsgsResp = await queueClient.receiveMessages({
    numberOfMessages: maxNumberOfMessages,
  });
  while (receivedMsgsResp.receivedMessageItems.length) {
    const uniqueQueueMessages: Set<string> = new Set(
      receivedMsgsResp.receivedMessageItems.map(({ messageText }) =>
        Buffer.from(messageText, 'base64').toString(),
      ),
    );

    await Promise.allSettled(
      receivedMsgsResp.receivedMessageItems.map(async (recivedMessage) =>
        queueClient.deleteMessage(
          recivedMessage.messageId,
          recivedMessage.popReceipt,
        ),
      ),
    );

    await Promise.allSettled([...uniqueQueueMessages].map((message) => axios.post(config.splunkUrl, { event: message }, {
      headers: {
        authorization: `Splunk ${config.splunkToken}`,
      },
    })));

    context.log('✔️ Data sent successfully');

    receivedMsgsResp = await queueClient.receiveMessages({
      numberOfMessages: maxNumberOfMessages,
    });
  }
};
export default timerTrigger;
