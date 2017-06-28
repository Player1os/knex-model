// Load app modules.
import ValidationError from '.../src/lib/error/validation'

// Load npm modules.
import * as Joi from 'joi'

// Expose the wrapper funtion.
export default (input: any, schema: Joi.AnySchema<any>) => {
	const validationResult = schema.validate(input, {
		abortEarly: false,
		convert: false,
		presence: 'required',
	})
	if (validationResult.error) {
		throw new ValidationError(validationResult)
	}
}
