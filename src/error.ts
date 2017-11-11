// Load scoped modules.
import {
	default as ValidationError,
	IErrorItem,
} from '@player1os/validation-error'

// Load npm modules.
import * as Joi from 'joi'
import * as lodash from 'lodash'

/**
 * An error class containing a parsed validation error, used to extract the important information from within a joi validation error.
 */
export class JoiValidationError extends ValidationError {
	/**
	 * Parses the joi validation error and use to create an object of error item arrays.
	 * @param joiValidationError A validation error thrown by a joi assertion.
	 */
	constructor(errorObject: Joi.ValidationError)
	constructor(errorObject: object) {
		// Store a typecasted version of the error object.
		const joiValidationError = errorObject as Joi.ValidationError
		const details: { [key: string]: IErrorItem[] } = {}

		if (joiValidationError.isJoi) {
			// Store the original value, that was validated against.
			const value = joiValidationError._object

			// Fill the details object.
			joiValidationError.details.forEach((joiValidationErrorItem) => {
				// Store the path within the original value.
				const path = joiValidationErrorItem.path

				// Parse the error item.
				const errorItem: IErrorItem = {
					value: (value instanceof Object) && (path in value)
						? lodash.get(value, path)
						: value,
					type: joiValidationErrorItem.type,
					message: joiValidationErrorItem.message,
				}

				// Add to the array of error items for the given path.
				if (!(path in details)) {
					details[path] = []
				}
				details[path].push(errorItem)
			})
		} else {
			lodash.merge(details, lodash.mapValues(errorObject, (errorObjectItem, errorObjectKey) => {
				return lodash.isArray(errorObjectItem)
					? errorObjectItem.map((errorObjectItemEntry) => {
						return {
							value: `[VALUE OF: ${errorObjectKey.toString()}]`,
							type: 'custom_validation_error',
							message: errorObjectItemEntry.toString() as string,
						} as IErrorItem
					})
					: {
						value: `[VALUE OF: ${errorObjectKey.toString()}]`,
						type: 'custom_validation_error',
						message: errorObjectItem.toString() as string,
					} as IErrorItem
			}))
		}

		// Copy the message from the joi validation error.
		super(details, (typeof joiValidationError.message === 'string') && (joiValidationError.message !== '')
			? joiValidationError.message
			: 'A validation error had occured')
	}
}
