/* tslint:disable max-classes-per-file */

// Load scoped modules.
import BaseError from '@player1os/base-error'

// Load npm modules.
import * as Joi from 'joi'
import * as lodash from 'lodash'

// TODO: Split into multiple modules.
// TODO: Make sure the typings are generated correctly.
// TODO: Elaborate on the type of the inputs.

// Expose error class.
export class EntityExistsError extends BaseError {
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

// Expose error class.
export class EntityNotFoundError extends BaseError {
	constructor() {
		// Call parent constructor.
		super('No entity exists that matches the submitted query')
	}
}

// Expose the base model class.
export abstract class Model {
	public table: string
	public fields: {
		[key: string]: Joi.Schema,
	}

	// A constructor that confirms that the required properties are present.
	constructor(
		protected knexWrapper,
	) {
		// Verify whether a table name is set.
		if (!this.table) {
			throw new Error('No table name was set in the model.')
		}

		// Verify whether a fields object is set.
		if (!this.fields) {
			throw new Error('No fields object was set in the model.')
		}
	}

	// All fields present in the underlying data object, a parameter specifies whether this includes the primary key.
	fieldNames(isKeyIncluded?: boolean) {
		const baseFieldNames = Object.keys(this.fields)
		if (isKeyIncluded) {
			baseFieldNames.push('key')
		}
		return baseFieldNames
	}

	// Create a single entity of the model.
	async create(values: object | object[], options: {
		isValidationEnabled?: boolean,
	} = {}): Promise<object[]> {
		try {
			// Validate create values.
			if (options.isValidationEnabled) {
				if (lodash.isArray(values)) {
					// TODO: Add.
					// values.forEach((valuesEntry) => {
						// this.createValuesValidator.validate(valuesEntry)
					// })
				} else {
					// TODO: Add.
					// this.createValuesValidator.validate(values)
				}
			}

			// Insert values into the underlying data object.
			const documents = await this.knexWrapper.instance(this.table)
				.insert(values)
				.returning(this.fieldNames(true))

			// Return all created documents.
			return documents
		} catch (err) {
			switch (err.code) {
				case '23505': {
					throw new EntityExistsError(err)
				}
				default: {
					throw err
				}
			}
		}
	}

	// Find all entities of the model matching the query.
	find(query: object, options: {
		isValidationEnabled?: boolean,
		orderBy?: [{
			column: string,
			direction: string,
		}],
	} = {}): Promise<object[]> {
		// Optionally validate the query values.
		if (options.isValidationEnabled) {
			// TODO: Add.
			// this.queryValidator.validate(query);
		}

		// Select values from the underlying data object.
		let knexQuery = this.knexWrapper.instance(this.table)
			.select(this.fieldNames(true))
			.where(query || {})

		// Add the optional order by clause.
		if (options.orderBy) {
			options.orderBy.forEach((orderByClause) => {
				knexQuery = knexQuery.orderBy(orderByClause.column, orderByClause.direction)
			})
		}

		// Return the prepared query builder.
		return knexQuery
	}

	// Find a single entity of the model matching the query.
	async findOne(query: object, options: {
		isValidationEnabled?: boolean,
		orderBy?: [{
			column: string,
			direction: string,
		}],
	} = {}) {
		// Optionally validate the query values.
		if (options.isValidationEnabled) {
			// TODO: Add.
			// this.queryValidator.validate(query)
		}

		// Select values from the underlying data object.
		let knexQuery = this.knexWrapper.instance(this.table)
			.select(this.fieldNames(true))
			.where(query || {})

		// Add the optional order by clause.
		if (options.orderBy) {
			options.orderBy.forEach((orderByClause) => {
				knexQuery = knexQuery.orderBy(orderByClause.column, orderByClause.direction)
			})
		}

		// Execute the built query.
		const documents = await knexQuery

		// Check if at least one document was found.
		if (documents.length === 0) {
			throw new EntityNotFoundError()
		}

		// TODO: Add a validation option to check if the returned value is unique.

		// Return the first retrieved document.
		return documents[0]
	}

	// Find the count of all entities of the model matching the query.
	async count(query: object, options: {
		isValidationEnabled?: boolean,
	} = {}) {
		// Optionally validate the query values.
		if (options.isValidationEnabled) {
			// TODO: Add.
			// this.queryValidator.validate(query);
		}

		// Select the count from the underlying data object.
		const result = await this.knexWrapper.instance(this.table)
			.count()
			.where(query || {})

		// Parse the result of the count query.
		return parseInt(result[0].count, 10)
	}

	// Update all entities of the model matching the query with the supplied values.
	async update(query: object, values: object) {
		// TODO: Add.
		/*
		// Validate update values.
		this.updateValuesValidator.validate(values);

		// Validate query.
		this.queryValidator.validate(query);
		*/

		// Update values in the underlying data object.
		const documents = await this.knexWrapper.instance(this.table)
			.update(values)
			.where(query || {})
			.returning(this.fieldNames(true))

		// Return the retrieved documents.
		return documents
	}

	// Delete all entities of the model matching the query.
	async destroy(query: object, options: {
		isValidationEnabled?: boolean,
	} = {}) {
		// Optionally validate the query values.
		if (options.isValidationEnabled) {
			// TODO: Add.
			// this.queryValidator.validate(query);
		}

		// Delete rows from the underlying data object.
		const documents = await this.knexWrapper.instance(this.table)
			.delete()
			.where(query || {})
			.returning(this.fieldNames(true))

		// Return the retrieved documents.
		return documents
	}

	async save(document: {
		key: number | string,
	}) {
		// Update the entity with the given document key using the given document values.
		// TODO: Replace with update by key.
		const documents = await this.update({
			key: document.key,
		}, lodash.pick(document, this.fieldNames()))

		// Return the first retrieved document.
		return documents[0]
	}

	async delete(document: {
		key: number | string,
	}) {
		// Destroy the row with the given document key.
		// TODO: Replace with destroy by key.
		const documents = await this.destroy({
			key: document.key,
		})

		// Return the first retrieved document.
		return documents[0]
	}
}
