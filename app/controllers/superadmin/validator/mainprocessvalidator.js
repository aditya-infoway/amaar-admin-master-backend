const Joi = require("joi");

const processRow = Joi.object({
  id: Joi.alternatives().try(Joi.number(), Joi.string()).optional(),
  processCode: Joi.string().trim().max(50).required(),
  processName: Joi.string().trim().max(150).required(),
  serialNo: Joi.number().integer().min(1).max(20).required(),
}).unknown(true);

const base = {
  financialYearId: Joi.number().integer().optional(),
  mainProcess: Joi.string().trim().max(150).required(),
  processes: Joi.array().items(processRow).min(1).required(),
  createdBy: Joi.number().integer().optional(),
  createdType: Joi.string().trim().max(50).optional(),
};

module.exports = {
  createMainProcess: Joi.object(base),
  updateMainProcess: Joi.object(base),
  updateStatus: Joi.object({
    status: Joi.boolean().required(),
  }),
};