// Load npm modules.
import * as Joi from 'joi'

// Define a reg exp for invalid characters.
const invalidCharactersRegExp = /[^a-z0-9_\-]/g

export default {
	validationSchema: Joi.string().regex(/^[a-z0-9_\-]+$/, 'token').max(256),
	fromName(name: string) {
		return name.toLowerCase().replace(invalidCharactersRegExp, '_')
	},
}
