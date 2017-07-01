// Load npm modules.
import * as Joi from 'joi'

// TODO: Test that the reg exp works as expected or if it should be replaced by joi's implementation.
// const validationRegExp = new RegExp(''
// 	+ '^'
// 		+ '(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\\.){3}'
// 		+ '([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])'
// 	+ '$'
// 	+ '|'
// 	+ '^'
// 		+ '\\s*'
// 		+ '('
// 			+ '('
// 				+ '([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:)'
// 			+ ')|('
// 				+ '([0-9A-Fa-f]{1,4}:){6}'
// 				+ '('
// 					+ ':[0-9A-Fa-f]{1,4}'
// 					+ '|'
// 					+ '((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})'
// 					+ '|'
// 					+ ':'
// 				+ ')'
// 			+ ')|('
// 				+ '([0-9A-Fa-f]{1,4}:){5}'
// 				+ '('
// 					+ '((:[0-9A-Fa-f]{1,4}){1,2})'
// 					+ '|'
// 					+ ':((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})'
// 					+ '|'
// 					+ ':'
// 				+ ')'
// 			+ ')|('
// 				+ '([0-9A-Fa-f]{1,4}:){4}'
// 				+ '('
// 					+ '((:[0-9A-Fa-f]{1,4}){1,3})'
// 					+ '|'
// 					+ '('
// 						+ '(:[0-9A-Fa-f]{1,4})?'
// 						+ ':'
// 						+ '((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})'
// 					+ ')'
// 					+ '|'
// 					+ ':'
// 				+ ')'
// 			+ ')|('
// 				+ '([0-9A-Fa-f]{1,4}:){3}'
// 				+ '('
// 					+ '((:[0-9A-Fa-f]{1,4}){1,4})'
// 					+ '|'
// 					+ '('
// 						+ '(:[0-9A-Fa-f]{1,4}){0,2}'
// 						+ ':'
// 						+ '((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})'
// 					+ ')'
// 					+ '|'
// 					+ ':'
// 				+ ')'
// 			+ ')|('
// 				+ '([0-9A-Fa-f]{1,4}:){2}'
// 				+ '('
// 					+ '((:[0-9A-Fa-f]{1,4}){1,5})'
// 					+ '|'
// 					+ '('
// 						+ '(:[0-9A-Fa-f]{1,4}){0,3}'
// 						+ ':'
// 						+ '((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})'
// 					+ ')'
// 					+ '|'
// 					+ ':'
// 				+ ')'
// 			+ ')|('
// 				+ '([0-9A-Fa-f]{1,4}:){1}'
// 				+ '('
// 					+ '((:[0-9A-Fa-f]{1,4}){1,6})'
// 					+ '|'
// 					+ '('
// 						+ '(:[0-9A-Fa-f]{1,4}){0,4}'
// 						+ ':'
// 						+ '((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})'
// 					+ ')'
// 					+ '|'
// 					+ ':'
// 				+ ')'
// 			+ ')|('
// 				+ ':'
// 				+ '('
// 					+ '((:[0-9A-Fa-f]{1,4}){1,7})'
// 					+ '|'
// 					+ '('
// 						+ '(:[0-9A-Fa-f]{1,4}){0,5}'
// 						+ ':'
// 						+ '((25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)(\\.(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)){3})'
// 					+ ')'
// 					+ '|'
// 					+ ':'
// 				+ ')'
// 			+ ')'
// 		+ ')'
// 		+ '(%.+)?'
// 		+ '\\s*'
// 	+ '$',
// )
// 'Must be a valid ip address'

// Expose the validation schema.
// TODO: Verify if it should be replaced with `Joi.string().regex(validationRegExp, 'ip-address')`.
export default Joi.string().ip({
	version: ['ipv4', 'ipv6'],
})
