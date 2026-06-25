import { sequelize } from "../../config/database.js";
import { bigIntId, foreignBigInt, modelOptions, quantity } from "../../database/models/model.helpers.js";

const KhatabookSettlement = sequelize.define(
  "KhatabookSettlement",
  {
    id: bigIntId,
    collectionId: foreignBigInt(),
    khatabookOrderId: foreignBigInt(),
    appliedFine: quantity(),
  },
  {
    ...modelOptions("khatabook_settlements", {
      indexes: [
        { fields: ["collection_id"] },
        { fields: ["khatabook_order_id"] },
      ],
    }),
  },
);

export default KhatabookSettlement;
