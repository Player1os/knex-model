// Load scoped modules.
import BaseError from '@player1os/base-error'

// Expose error class.
export default class EntityExistsError extends BaseError {
	fieldName
	constraint
	fields
	values
	detail

	constructor(knexError) {
		// Call parent constructor.
		super('An entity already exists with the submitted unique field values')

		// Parse knex error.
		const matches = knexError.detail.match(/^Key \((.*)\)=\((.*)\) already exists.$/)
		const fields = matches[1].split(', ')

		// Fill error properties.
		this.constraint = knexError.constraint
		this.fields = fields.map((field) => {
			return `"${knexError.table}.${field}"`
		}).join(', ')
		this.values = matches[2].split(', ').map((value) => {
			return `'${value}'`
		}).join(', ')

		this.detail = fields.reduce((accumulator, field) => {
			accumulator[field] = {
				input: this.values,
				type: 'any.db_unique_constraint',
				message: `A "${knexError.table}" entity already exists with the same value ${this.values}`
					+ ` in the ${this.fields} field${(this.fields.length > 1) ? 's' : ''}`,
			}
			return accumulator
		}, {})
	}
}
