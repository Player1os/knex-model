// Load app modules.
import {
	IDestroyOptions,
	IFindOptions,
	IUpdateOptions,
	Model,
} from '.../src/model'

// Load scoped modules.
import { KnexWrapper } from '@player1os/knex-wrapper'

// Load npm modules.
import * as Joi from 'joi'
import * as lodash from 'lodash'

// Define and expose the types that describe the table key and array of table keys.
export type TKey = number | string
export type TKeyArray = number[] | string[]

// Define the interfaces that describe input values and query items containing the table key or an array of table keys.
export interface IKeyEntity {
	key: TKey,
}
export interface IKeyQueryItem {
	key?: TKey | TKeyArray,
}

// Expose the base model class.
export abstract class KeyModel<
		IEntity extends IKeyEntity,
		ICreateValues extends object,
		IUpdateValues extends object,
		IQueryItem extends IKeyQueryItem
	> extends Model<IEntity, ICreateValues, IUpdateValues, IQueryItem> {
	/**
	 * A constructor that confirms that the required properties are present.
	 * @param knexWrapper The object containing the knex instance.
	 * @param table The name of the underlying table.
	 * @param fields The names and validation schemas of the table's fields.
	 */
	constructor(
		_knexWrapper: KnexWrapper,
		table: string,
		fields: {
			key: Joi.NumberSchema | Joi.StringSchema,
			[fieldName: string]: Joi.BooleanSchema | Joi.NumberSchema | Joi.StringSchema | Joi.ObjectSchema | Joi.DateSchema,
		},
	) {
		// Call the parent constructor.
		super(_knexWrapper, table, fields,
			// Define validator from the schema for the create values.
			// - all required fields must be present.
			// - all specified keys must correspond to fields.
			// - all present fields must conform to the given rules.
			Joi.object(lodash.pickBy(fields, (_value, key) => {
				return key !== 'key'
			}) as Joi.SchemaMap).options({
				abortEarly: false,
				convert: false,
				presence: 'required',
			}),
			// Define validator from the schema for the update values.
			// - all specified keys must correspond to fields.
			// - all present fields must conform to the given rules.
			Joi.object(lodash.pickBy(fields, (_value, key) => {
				return key !== 'key'
			}) as Joi.SchemaMap).options({
				abortEarly: false,
				convert: false,
				presence: 'optional',
			}),
		)

		// Verify whether a fields object contains the primary key.
		if (!this.fields.key) {
			throw new Error('The submitted fields object does not contain a primary key entry.')
		}
	}

	/**
	 * All fields present in the underlying data object, a parameter specifies whether this includes the primary key.
	 * @param isKeyExcluded Specifies whether the primary key should be present.
	 */
	fieldNames(isKeyExcluded?: boolean) {
		const baseFieldNames = super.fieldNames()
		return isKeyExcluded
			? baseFieldNames.filter((baseFieldName) => {
				return baseFieldName !== 'key'
			})
			: baseFieldNames
	}

	/**
	 * Find a single entity of the model matching the key.
	 * @param key
	 * @param options
	 */
	protected async _findByKey(key: TKey, options: IFindOptions = {}) {
		// Call the find one method with only the key in the query.
		return this._findOne({ key } as IQueryItem, options)
	}

	/**
	 * Update a single entity of the model matching the key with the supplied values.
	 * @param key
	 * @param values
	 * @param options
	 */
	protected async _updateByKey(key: TKey, values: IUpdateValues, options: IUpdateOptions = {}) {
		// Call the update one method with only the key in the query.
		return this._updateOne({ key } as IQueryItem, values, options)
	}

	/**
	 * Destroy a single entity of the model matching the key.
	 * @param key
	 * @param options
	 */
	protected async _destroyByKey(key: TKey, options: IDestroyOptions = {}) {
		// Call the destroy one method with only the key in the query.
		return this._destroyOne({ key } as IQueryItem, options)
	}

	/**
	 * Update the entity indicated by the primary key that's part of the given document.
	 * @param document
	 * @param options
	 */
	protected async _save(document: IEntity, options: IUpdateOptions = {}) {
		// Update the entity with the given document key using the given document values.
		return this._updateByKey(document.key, lodash.pick(document, this.fieldNames()) as IUpdateValues, options)
	}

	/**
	 * Destroy the entity indicated by the primary key that's part of the given document.
	 * @param document
	 * @param options
	 */
	protected async _delete(document: IEntity, options: IDestroyOptions = {}) {
		// Destroy the entity with the given document key.
		return this._destroyByKey(document.key, options)
	}
}
