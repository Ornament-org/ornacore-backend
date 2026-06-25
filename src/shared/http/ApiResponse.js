export class ApiResponse {
  static success({ data = null, message = "Request completed successfully", meta } = {}) {
    return {
      success: true,
      message,
      data,
      ...(meta ? { meta } : {}),
    };
  }

  static error({ message, code, details, requestId }) {
    return {
      success: false,
      error: {
        code,
        message,
        ...(details ? { details } : {}),
      },
      ...(requestId ? { requestId } : {}),
    };
  }
}
