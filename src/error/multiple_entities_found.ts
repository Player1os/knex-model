// Load scoped modules.
import BaseError from '@player1os/base-error'

// Expose the error class.
export default class MultipleEntitiesFoundError extends BaseError {
	constructor() {
		// Call parent constructor.
		super('More than a single entity exists that matches the submitted query')
	}
}
