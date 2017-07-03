// Load scoped modules.
import BaseError from '@player1os/base-error'

// Load npm modules.
import * as Joi from 'joi'
import * as lodash from 'lodash'

/**
 * An interface describing a single parsed validation error.
 */
export interface IErrorItem {
	value: any,
	type: string,
	message: string,
}

/**
 * An error class containing a parsed validation error, used to extract the important information from within a joi validation error.
 */
export default class ValidationError extends BaseError {
	/**
	 * Parsed validation error.
	 */
	public readonly details: {
		readonly [key: string]: IErrorItem[],
	}

	/**
	 * Parses the joi validation error and use to create an object of error item arrays.
	 * @param joiValidationError A validation error thrown by a joi assertion.
	 */
	constructor(joiValidationError: Joi.ValidationError) {
		// Copy the message from the joi validation error.
		super(joiValidationError.message)

		// Store the original value, that was validated against.
		const value = joiValidationError._object

		// Fill the details object.
		this.details = joiValidationError.details.reduce((map, joiValidationErrorItem) => {
			// Determin the path within the original value.
			const path = (value instanceof Object) && (joiValidationErrorItem.path in value)
				? joiValidationErrorItem.path
				: ''

			// Parse the error item.
			const errorItem: IErrorItem = {
				value: path
					? lodash.get(value, path)
					: value,
				type: joiValidationErrorItem.type,
				message: joiValidationErrorItem.message,
			}

			// Add to the array of error items for the given path.
			if (!(path in map)) {
				map[path] = []
			}
			map[path].push(errorItem)

			// Return the accumulated object.
			return map
		}, {})
	}
}