import { DataTypes } from "sequelize";

export const bigIntId = {
  type: DataTypes.BIGINT.UNSIGNED,
  autoIncrement: true,
  primaryKey: true,
};

export const foreignBigInt = ({ allowNull = false } = {}) => ({
  type: DataTypes.BIGINT.UNSIGNED,
  allowNull,
});

export const money = ({ allowNull = false, defaultValue } = {}) => ({
  type: DataTypes.DECIMAL(18, 4),
  allowNull,
  ...(defaultValue !== undefined ? { defaultValue } : {}),
});

export const quantity = ({ allowNull = false, defaultValue } = {}) => ({
  type: DataTypes.DECIMAL(14, 3),
  allowNull,
  ...(defaultValue !== undefined ? { defaultValue } : {}),
});

export const modelOptions = (tableName, options = {}) => ({
  tableName,
  underscored: true,
  timestamps: true,
  ...options,
});
