// Load app modules.
import ValidationError from '.../src/error'

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
export default (value: any, schema: Joi.Schema | Joi.SchemaMap) => {
	// Execute the validation.
	const { error } = Joi.validate(value, schema, {
		abortEarly: false,
		convert: false,
		presence: 'required',
	})

	// Check if an error was detected.
	if (error !== null) {
		// Rethrow as a valiadtion error.
		throw new ValidationError(error)
	}
}
