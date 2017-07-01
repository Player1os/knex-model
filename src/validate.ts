// Load npm modules.
import * as Joi from 'joi'

/**
 * Asserts the value against the submitted schema. Befor validation, adds the following options:
 * {
 *   abortEarly: false,
 *   convert: false,
 *   presence: 'required',
 * }
 * @param value A value to be validated.
 * @param schema A joi schema to use for the validation.
 */
export default (value: any, schema: Joi.Schema) => {
	Joi.assert(value, schema.options({
		abortEarly: false,
		convert: false,
		presence: 'required',
	}))
}
