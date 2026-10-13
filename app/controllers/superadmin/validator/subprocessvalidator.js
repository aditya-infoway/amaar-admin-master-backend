const Joi = require("joi");

const base = {
  financialYearId: Joi.number().integer().optional(),
  processId: Joi.number().integer().required(),
  subProcessName: Joi.string().trim().max(150).required(),
  subProcessCode: Joi.string().trim().max(50).required(),
  serialNo: Joi.number().integer().min(1).max(20).required(),
  createdBy: Joi.number().integer().optional(),
  createdType: Joi.string().trim().max(50).optional(),
};

module.exports = {
  createSubProcess: Joi.object(base),
  updateSubProcess: Joi.object(base),
  updateStatus: Joi.object({ status: Joi.boolean().required() }),
};