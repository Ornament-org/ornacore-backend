import { ACTOR_TYPES } from "../../constants/app.constants.js";
import { authenticate } from "../../middlewares/authenticate.js";
import { authorize } from "../../middlewares/authorize.js";
import { requireActorType } from "../../middlewares/requireActorType.js";
import { requirePasswordChangeComplete } from "../../middlewares/requirePasswordChangeComplete.js";

export const protectAdmin = (...permissions) => [
  authenticate,
  requireActorType(ACTOR_TYPES.ADMIN, ACTOR_TYPES.STAFF),
  requirePasswordChangeComplete,
  ...(permissions.length ? [authorize(...permissions)] : []),
];
