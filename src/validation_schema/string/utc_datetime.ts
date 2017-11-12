// Load npm modules.
import * as Joi from 'joi'

/**
 * A validation schema for token string values.
 */
export default (options = {
	dateDelimiter: '/',
	timeDelimiter: ':',
	portionDelimiter: '_',
}) => {
	return Joi.string().regex(new RegExp(
		'^'
		+ [
			// Date portion.
			[
				'[0-9]{4}', // Year.
				'(?:0[1-9]|1[0-2])', // Month.
				'(?:0[1-9]|[12][0-9]|3[01])', // Day.
			].join(options.dateDelimiter),
			// Time portion.
			[
				'(?:[01][0-9]|2[0-3])', // Hour.
				'(?:[0-5][0-9])', // Minute.
				'(?:[0-5][0-9])', // Second.
			].join(options.timeDelimiter),
			'(?:[0-9]{3})', // Millisecond.
		].join(options.portionDelimiter)
		+ '$',
	), 'UTCDateTime').max(256)
}
