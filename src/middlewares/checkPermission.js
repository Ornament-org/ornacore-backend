import { authorize } from "./authorize.js";

export const checkPermission = (permissionKey) => authorize(permissionKey);
