// Load npm modules.
import {
	Request,
} from 'express'
import * as lodash from 'lodash'

export default {
	getOriginalUrl(req: Request) {
		// TODO: Maybe use the url library for this.
		return `${req.protocol}://${req.headers.host}${req.originalUrl}`
	},
	getIpAddress(req: Request) {
		// TODO: Implement an experiment for a month where the req.ip is returned by default, and only if invalid
		// and in the same time the implementation proposes a valid alternative, the instance should be logged.

		const ipAddress = req.ip
			|| lodash.isArray(req.headers['x-forwarded-for'])
				? req.headers['x-forwarded-for'][0]
				: req.headers['x-forwarded-for'] as string
			|| req.connection.remoteAddress
			|| req.socket.remoteAddress

		// Handle case where the unknown ip address is reported by a string.
		if (!ipAddress || (ipAddress === 'unknown')) {
			return null
		}

		// Handle the case where multiple ip addresses are retrieved.
		return ipAddress.split(', ')[0]
	},
	getHostname(req: Request) {
		// TODO: Implement an experiment for a month where the req.hostname is returned by default, and only if invalid
		// and in the same time the implementation proposes a valid alternative, the instance should be logged.

		// Chech if the request contains a valid host header.
		if (!(typeof req.headers.host === 'string')) {
			return null
		}

		// Omit username, password prefix and port suffix ':'.
		return lodash.last((req.headers.host as string).split('@')).split(':')[0]
	},
}
