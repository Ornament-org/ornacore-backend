const humanizePath = (path) =>
  path
    .filter((part) => part !== "body" && part !== "params" && part !== "query")
    .join(".")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());

export const validationDetails = (zodError) => zodError.flatten();

export const validationMessage = (zodError) => {
  const firstIssue = zodError.issues?.[0];
  if (!firstIssue) return "Please fix the highlighted fields before continuing.";

  const field = humanizePath(firstIssue.path);
  return field
    ? `Please fix ${field}: ${firstIssue.message}`
    : `Please fix the request: ${firstIssue.message}`;
};
