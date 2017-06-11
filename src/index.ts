/* tslint:disable max-classes-per-file */

// Load scoped modules.
import BaseError from '@player1os/base-error'

// Load npm modules.
import * as Joi from 'joi'
import * as Knex from 'knex'
import * as lodash from 'lodash'

// TODO: Split into multiple modules.
// TODO: Make sure the typings are generated correctly.
// TODO: Elaborate on the type of the inputs.
// TODO: Enable the use of a raw where caluse.
// TODO: Add typings for the knex wrapper.

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

// Expose the interface that defines input values.
export interface IDocument {
	[key: string]: boolean | number | string | null,
}

// Expose the base model class.
export abstract class Model {
	protected createValuesValidationSchema: Joi.ObjectSchema
	protected updateValuesValidationSchema: Joi.ObjectSchema
	protected queryValidationSchema: Joi.ObjectSchema

	// A constructor that confirms that the required properties are present.
	constructor(
		protected knexWrapper: {
			instance: Knex,
		},
		public table: string,
		public fields: {
			key: Joi.NumberSchema | Joi.StringSchema,
			[key: string]: Joi.BooleanSchema | Joi.NumberSchema | Joi.StringSchema,
		},
	) {
		// Verify whether a table name is set.
		if (!this.table) {
			throw new Error('No table name was set in the model.')
		}

		// Verify whether a fields object is set and contains the key field.
		if (!this.fields || !this.fields.key) {
			throw new Error('No fields object containing a key field was set in the model.')
		}

		// Define validator from the schema for the create values.
		// - all required fields must be present.
		// - all specified keys must correspond to fields.
		// - all present fields must conform to the given rules.
		this.createValuesValidationSchema = Joi.object(lodash.pickBy(this.fields, (_value, key) => {
			return key !== 'key'
		}) as Joi.SchemaMap).options({
			abortEarly: false,
			convert: false,
			presence: 'required',
		})

		// Define validator from the schema for the update values.
		// - all specified keys must correspond to fields.
		// - all present fields must conform to the given rules.
		this.updateValuesValidationSchema = Joi.object(lodash.pickBy(this.fields, (_value, key) => {
			return key !== 'key'
		}) as Joi.SchemaMap).options({
			abortEarly: false,
			convert: false,
			presence: 'optional',
		})

		// Outputs the schema for the query during model extension.
		// - all specified keys must correspond to (fields + primary key field).
		// - all present (fields + primary key field) must conform to the given rules.
		this.queryValidationSchema = Joi.object(this.fields).options({
			abortEarly: false,
			convert: false,
			presence: 'optional',
		})
	}

	// All fields present in the underlying data object, a parameter specifies whether this includes the primary key.
	fieldNames(isKeyIncluded?: boolean) {
		const baseFieldNames = Object.keys(this.fields)
		return isKeyIncluded
			? baseFieldNames
			: baseFieldNames.filter((baseFieldName) => {
				return baseFieldName !== 'key'
			})
	}

	// Create entities of the model using the provided values.
	async create(values: IDocument[], options: {
		isValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}) {
		try {
			// Optionally validate the create values.
			if (!options.isValidationDisabled) {
				values.forEach((valuesEntry) => {
					const { error } = this.createValuesValidationSchema.validate(valuesEntry)
					if (error) {
						throw error
					}
				})
			}

			// Prepare an insertion query builder.
			let knexQuery = this.knexWrapper.instance(this.table)
				.insert(values)
				.returning(this.fieldNames(true))

			// Optionally use the supplied transaction.
			if (options.transaction) {
				knexQuery = knexQuery.transacting(options.transaction)
			}

			// Execute the prepared query builder.
			const documents = await knexQuery

			// Return the created documents.
			return documents
		} catch (err) {
			// Attempt to better identify the error.
			switch (err.code) {
				case '23505':
					// Encapsulate in an entity exists error and throw it.
					throw new EntityExistsError(err)
				default:
					// Rethrow the error.
					throw err
			}
		}
	}

	// Create a single entity of the model.
	async createOne(values: IDocument, options: {
		isValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}) {
		// Attempt to create the document.
		const documents = await this.create([values], options)

		// TODO: Add a length check for the array.

		// Return the first created document.
		return documents[0]
	}

	// Prepare a pluggable knex query based on the query parameters.
	protected prepareQueryParameters(query: IDocument) {
		return this.knexWrapper.instance(this.table)
			.where(query)
	}

	// Find all entities of the model matching the query.
	async find(query: IDocument, options: {
		isValidationDisabled?: boolean,
		orderBy?: [{
			column: string,
			direction: string,
		}],
		limit?: number,
		offset?: number,
		transaction?: Knex.Transaction,
	} = {}) {
		// Optionally validate the query values.
		if (!options.isValidationDisabled) {
			const { error } = this.queryValidationSchema.validate(query)
			if (error) {
				throw error
			}
		}

		// Prepare a selection query builder.
		let knexQuery = this.prepareQueryParameters(query)
			.select(this.fieldNames(true))

		// Add the optional order by clause.
		if (options.orderBy) {
			options.orderBy.forEach((orderByClause) => {
				knexQuery = knexQuery.orderBy(orderByClause.column, orderByClause.direction)
			})
		}

		// Add the optional limit clause.
		if (options.limit) {
			knexQuery = knexQuery.limit(options.limit)
		}

		// Add the optional offset clause.
		if (options.offset) {
			knexQuery = knexQuery.offset(options.offset)
		}

		// Optionally use the supplied transaction.
		if (options.transaction) {
			knexQuery = knexQuery.transacting(options.transaction)
		}

		// Execute the prepared query builder.
		const documents = await knexQuery

		// Return the found documents.
		return documents
	}

	// Find a single entity of the model matching the query.
	async findOne(query: IDocument, options: {
		isValidationDisabled?: boolean,
		orderBy?: [{
			column: string,
			direction: string,
		}],
		limit?: number,
		offset?: number,
		transaction?: Knex.Transaction,
	} = {}) {
		// Attempt to find the document.
		const documents = await this.find(query, Object.assign({
			limit: 1,
		}, options))

		// Check if at least one document was found.
		if (documents.length === 0) {
			throw new EntityNotFoundError()
		}

		// TODO: Add a validation option to check if the returned value is unique.

		// Return the first retrieved document.
		return documents[0]
	}

	// Find the count of all entities of the model matching the query.
	async count(query: IDocument, options: {
		isValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}) {
		// Optionally validate the query values.
		if (!options.isValidationDisabled) {
			const { error } = this.queryValidationSchema.validate(query)
			if (error) {
				throw error
			}
		}

		// Prepare a selection query builder.
		let knexQuery = this.prepareQueryParameters(query)
			.count()

		// Optionally use the supplied transaction.
		if (options.transaction) {
			knexQuery = knexQuery.transacting(options.transaction)
		}

		// Execute the prepared query builder.
		const result = await knexQuery

		// Parse the result of the count query.
		return parseInt(result[0].count, 10)
	}

	// Update all entities of the model matching the query with the supplied values.
	async update(query: IDocument, values: IDocument, options: {
		isQueryValidationDisabled?: boolean,
		isValuesValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}) {
		// Optionally validate the query values.
		if (!options.isQueryValidationDisabled) {
			const { error } = this.queryValidationSchema.validate(query)
			if (error) {
				throw error
			}
		}

		// Optionally validate the update values.
		if (!options.isValuesValidationDisabled) {
			const { error } = this.updateValuesValidationSchema.validate(values)
			if (error) {
				throw error
			}
		}

		// Prepare an update query builder.
		let knexQuery = this.prepareQueryParameters(query)
			.update(values)
			.returning(this.fieldNames(true))

		// Optionally use the supplied transaction.
		if (options.transaction) {
			knexQuery = knexQuery.transacting(options.transaction)
		}

		// Return the prepared query builder.
		const documents = await knexQuery

		// Return the updated documents.
		return documents
	}

	// Destroy all entities of the model matching the query.
	async destroy(query: IDocument, options: {
		isValidationDisabled?: boolean,
		transaction?: Knex.Transaction,
	} = {}) {
		// Optionally validate the query values.
		if (!options.isValidationDisabled) {
			const { error } = this.queryValidationSchema.validate(query)
			if (error) {
				throw error
			}
		}

		// Prepare a deletion query builder.
		let knexQuery = this.prepareQueryParameters(query)
			.delete()
			.returning(this.fieldNames(true))

		// Optionally use the supplied transaction.
		if (options.transaction) {
			knexQuery = knexQuery.transacting(options.transaction)
		}

		// Return the prepared query builder.
		const documents = await knexQuery

		// Return the destroyed documents.
		return documents
	}

	// Update the entity indicated by the primary key that's part of the given document.
	async save(document: {
		key: number | string,
	}) {
		// Update the entity with the given document key using the given document values.
		// TODO: Replace with update by key.
		const documents = await this.update({
			key: document.key,
		}, lodash.pick(document, this.fieldNames()) as {})

		// Return the first retrieved document.
		return documents[0]
	}

	// Destroy the entity indicated by the primary key that's part of the given document.
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
