import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const Banner = sequelize.define(
  "Banner",
  {
    id: bigIntId,
    title: { type: DataTypes.STRING(200), allowNull: false },
    subtitle: { type: DataTypes.STRING(300), allowNull: true },
    placementId: foreignBigInt({ allowNull: false }),
    metalId: foreignBigInt({ allowNull: true }),
    imageId: foreignBigInt({ allowNull: false }),
    mobileImageId: foreignBigInt({ allowNull: true }),
    linkUrl: { type: DataTypes.STRING(500), allowNull: true },
    sortOrder: { type: DataTypes.INTEGER.UNSIGNED, allowNull: false, defaultValue: 0 },
    status: {
      type: DataTypes.ENUM("ACTIVE", "INACTIVE"),
      allowNull: false,
      defaultValue: "ACTIVE",
    },
    startsAt: { type: DataTypes.DATE, allowNull: true },
    endsAt: { type: DataTypes.DATE, allowNull: true },
    createdByUserId: foreignBigInt({ allowNull: true }),
    updatedByUserId: foreignBigInt({ allowNull: true }),
  },
  {
    ...modelOptions("banners", {
      indexes: [
        { fields: ["placement_id"] },
        { fields: ["status"] },
        { fields: ["sort_order"] },
        { fields: ["metal_id"] },
      ],
    }),
  },
);

export default Banner;
