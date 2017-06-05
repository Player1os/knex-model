// Load scoped modules.
import BaseError from '@player1os/base-error'

// Expose error class.
export default class EntityNotFoundError extends BaseError {
	constructor() {
		// Call parent constructor.
		super('No entity exists that matches the submitted query')
	}
}
