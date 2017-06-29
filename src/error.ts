// Load scoped modules.
import BaseError from '@player1os/base-error'

// Load npm modules.
import * as Joi from 'joi'

// Expose the error class.
export default class ValidationError extends BaseError {
	public readonly input: any
	public readonly detail: {}

	constructor(joiValidationResult: Joi.ValidationResult<any>) {
		// Call the parent constructor.
		super(`The submitted input failed to pass the required validation tests.\n${joiValidationResult.error.message}`)

		// Retrieve original input.
		this.input = joiValidationResult.value

		// Retrieve validation error details.
		this.detail = joiValidationResult.error.details.reduce((map, joiErrorItem) => {
			map[joiErrorItem.path] = {
				input: ((typeof this.input === 'object') && (joiErrorItem.path in this.input))
					? this.input[joiErrorItem.path]
					: this.input,
				type: joiErrorItem.type,
				message: joiErrorItem.message,
			}
			return map
		}, {})
	}
}
