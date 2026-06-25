import db from "../database/models/InitializeModels.js";
import { AppError } from "../shared/errors/AppError.js";
import { asyncHandler } from "../shared/http/asyncHandler.js";

export const requireApprovedShopkeeper = asyncHandler(async (request, _response, next) => {
  const profile = await db.ShopkeeperProfile.findOne({
    where: { userId: request.auth.sub },
  });
  if (!profile) {
    throw new AppError("Shopkeeper profile not found", {
      statusCode: 404,
      code: "SHOPKEEPER_PROFILE_MISSING",
    });
  }
  if (profile.status !== "APPROVED") {
    throw new AppError("Shopkeeper account is not approved", {
      statusCode: 403,
      code: "SHOPKEEPER_NOT_APPROVED",
      details: { status: profile.status },
    });
  }
  request.shopkeeper = profile;
  next();
});
