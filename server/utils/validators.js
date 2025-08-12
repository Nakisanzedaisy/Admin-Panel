const Joi = require('joi');

const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required()
});

const createUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  role: Joi.string().valid('SUPER_ADMIN', 'ADMIN').required()
});

const updateUserSchema = Joi.object({
  firstName: Joi.string().min(2).max(50).optional(),
  lastName: Joi.string().min(2).max(50).optional(),
  role: Joi.string().valid('SUPER_ADMIN', 'ADMIN').optional(),
  status: Joi.string().valid('ACTIVE', 'INACTIVE', 'PENDING').optional()
});

module.exports = {
  loginSchema,
  createUserSchema,
  updateUserSchema
};
