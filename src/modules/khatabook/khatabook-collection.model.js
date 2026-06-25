import { DataTypes } from "sequelize";
import { sequelize } from "../../config/database.js";
import {
  bigIntId,
  foreignBigInt,
  modelOptions,
  money,
  quantity,
} from "../../database/models/model.helpers.js";
import { KHATABOOK_COLLECTION_TYPES } from "./khatabook.constants.js";

const KhatabookCollection = sequelize.define(
  "KhatabookCollection",
  {
    id: bigIntId,
    sourceOrderId: foreignBigInt({ allowNull: true }),
    shopkeeperId: foreignBigInt(),
    metalId: foreignBigInt(),
    collectionType: {
      type: DataTypes.ENUM(...Object.values(KHATABOOK_COLLECTION_TYPES)),
      allowNull: false,
    },
    receivedQuantity: quantity({ allowNull: true }),
    cashAmount: money({ allowNull: true }),
    metalRate: money({ allowNull: true }),
    fineCredit: quantity(),
    collectionDate: { type: DataTypes.DATE, allowNull: false },
    notes: { type: DataTypes.TEXT, allowNull: true },
    createdByUserId: foreignBigInt({ allowNull: true }),
  },
  {
    ...modelOptions("khatabook_collections", {
      indexes: [
        { fields: ["shopkeeper_id", "metal_id", "collection_date"] },
        { fields: ["source_order_id"] },
      ],
    }),
  },
);

export default KhatabookCollection;
