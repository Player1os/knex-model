// Load app modules.
import { Model } from '.../src/model'

// Load scoped modules.
import { KnexWrapper } from '@player1os/knex-wrapper'

// Load npm modules.
import * as Joi from 'joi'

// Expose the base model class.
export abstract class StandardModel<IEntity extends object> extends Model<IEntity> {
	/**
	 * A constructor that confirms that the required properties are present.
	 * @param knexWrapper The object containing the knex instance.
	 * @param table The name of the underlying table.
	 * @param fields The names and validation schemas of the table's fields.
	 */
	constructor(
		knexWrapper: KnexWrapper,
		table: string,
		fields: {
			[fieldName: string]: Joi.BooleanSchema | Joi.NumberSchema | Joi.StringSchema | Joi.ObjectSchema | Joi.DateSchema,
		},
	) {
		// Call the parent constructor.
		super(knexWrapper, table, fields,
			// Define validator from the schema for the create values.
			// - all non-optional fields must be present.
			// - all specified keys must correspond to fields.
			// - all present fields must conform to the given rules.
			Joi.object(fields).options({
				abortEarly: false,
				convert: false,
				presence: 'required',
			}),
			// Define validator from the schema for the update values.
			// - all specified keys must correspond to fields.
			// - all present fields must conform to the given rules.
			Joi.object(fields).options({
				abortEarly: false,
				convert: false,
				presence: 'optional',
			}),
		)
	}
}
