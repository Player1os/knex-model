/* tslint:disable max-classes-per-file */

// Load scoped modules.
import BaseError from '@player1os/base-error'

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

// Load npm modules.
import * as lodash from 'lodash'

// Expose the base model object.
export default {
	// Create new models by extending the current one.
	extend(model) {
		// Setup the prototype chain.
		Object.setPrototypeOf(model, this)

		// Verify whether a knex instance is set.
		if (!model.knex) {
			throw new Error('No knex instance was set in the model.')
		}

		// Verify whether a table name is set.
		if (!model.table) {
			throw new Error('No table name was set in the model.')
		}

		// Verify whether a fields object is set.
		if (!model.fields) {
			throw new Error('No fields object was set in the model.')
		}

		// Pass the extended model to the caller.
		return model
	},
	// All fields present in the underlying data object,
	// a parameter specifies whether this includes the primary key.
	fieldNames(isKeyIncluded) {
		const baseFieldNames = Object.keys(this.fields)
		if (isKeyIncluded) {
			baseFieldNames.push('key')
		}
		return baseFieldNames
	},
	// Create a single entity of the model.
	async create(values) {
		try {
			// TODO: Add.
			/*
			// Validate create values.
			this.createValuesValidator.validate(values);
			*/

			// Insert values into the underlying data object.
			const documents = await this.knexWrapper.instance(this.table)
				.insert(values)
				.returning(this.fieldNames(true))

			// Return the first created document.
			return documents[0]
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
	},
	// Find all entities of the model matching the query.
	async find(query, options = {
		orderBy: null,
	}) {
		// TODO: Add.
		/*
		// Validate query.
		this.queryValidator.validate(query);
		*/

		// Select values from the underlying data object.
		let knexQuery = this.knexWrapper.instance(this.table)
			.select(this.fieldNames(true))
			.where(query || {})

		// Add an order by clause if needed.
		if (options.orderBy) {
			options.orderBy.forEach((orderByClause) => {
				knexQuery = knexQuery.orderBy(orderByClause.column, orderByClause.direction)
			})
		}

		// Execute the built query.
		const documents = await knexQuery

		// Return the result.
		return documents
	},
	// Find all entities of the model matching the query.
	async findOne(query) {
		// TODO: Add.
		/*
		// Validate query.
		this.queryValidator.validate(query);
		*/

		// Select values from the underlying data object.
		const documents = await this.knexWrapper.instance(this.table)
			.select(this.fieldNames(true))
			.where(query || {})
			// Limit to a single row.
			.limit(1)

		// Check if at least one document was found.
		if (documents.length === 0) {
			throw new EntityNotFoundError()
		}

		// Return the first retrieved document.
		return documents[0]
	},
	// Find the count of all entities of the model matching the query.
	async count(query) {
		// TODO: Add.
		/*
		// Validate query.
		this.queryValidator.validate(query);
		*/

		// Select the count from the underlying data object.
		const result = await this.knexWrapper.instance(this.table)
			.count()
			.where(query || {})

		// Parse the result of the count query.
		return parseInt(result[0].count, 10)
	},
	// Update all entities of the model matching the query with the supplied values.
	async update(query, values) {
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
	},
	// Delete all entities of the model matching the query.
	async destroy(query) {
		// TODO: Add.
		/*
		// Validate query.
		this.queryValidator.validate(query);
		*/

		// Delete rows from the underlying data object.
		const documents = await this.knexWrapper.instance(this.table)
			.delete()
			.where(query || {})
			.returning(this.fieldNames(true))

		// Return the retrieved documents.
		return documents
	},
	async save(document) {
		// Update the entity with the given document key using the given document values.
		const documents = await this.update({
			key: document.key,
		}, lodash.pick(document, this.fieldNames()))

		// Return the first retrieved document.
		return documents[0]
	},
	async delete(document) {
		// Destroy the row with the given document key.
		const documents = await this.destroy({
			key: document.key,
		})

		// Return the first retrieved document.
		return documents[0]
	},
}
