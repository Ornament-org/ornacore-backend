import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions } from "../../database/models/model.helpers.js";

const MediaFolder = sequelize.define(
  "MediaFolder",
  {
    id: bigIntId,
    name: { type: DataTypes.STRING(150), allowNull: false },
    parentId: foreignBigInt({ allowNull: true }),
    createdByUserId: foreignBigInt({ allowNull: true }),
  },
  {
    ...modelOptions("media_folders"),
  },
);

export default MediaFolder;
