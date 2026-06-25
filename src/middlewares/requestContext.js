import pinoHttp from "pino-http";
import { v7 as uuidv7 } from "uuid";
import { logger } from "../config/logger.js";

export const requestContext = pinoHttp({
  logger,
  genReqId: (request, response) => {
    const requestId = request.headers["x-request-id"] || uuidv7();
    response.setHeader("x-request-id", requestId);
    return requestId;
  },
  customProps: (request) => ({
    requestId: request.id,
    actorId: request.auth?.userId,
  }),
  serializers: {
    req: (request) => ({
      id: request.id,
      method: request.method,
      url: request.url,
      remoteAddress: request.remoteAddress,
    }),
  },
});
