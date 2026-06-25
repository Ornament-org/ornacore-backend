import { v7 as uuidv7 } from "uuid";

export const requestContext = (request, response, next) => {
  const requestId = request.headers["x-request-id"] || uuidv7();
  request.id = requestId;
  response.setHeader("x-request-id", requestId);
  next();
};
