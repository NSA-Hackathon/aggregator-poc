import { Context, HttpRequest } from "@azure/functions"
import { config } from "../config";

export default async function BatchRequests(context: Context, req: HttpRequest) {
    if (req.headers.authorization in config.apiKeys) {
        const serviceName = config.apiKeys[req.headers.authorization];
        context.log(`📬 Received request from ${serviceName}`);
        context.log('✉️ Sending request to queue');
        context.bindings.splunkSendQueue = { request: req, serviceName };
        context.res = { body: "Success" };
    } else {
        context.log.error('🚫 Invalid API Key');
        context.res = { status: 401, body: '🚫 Invalid API Key' };
    }
}
