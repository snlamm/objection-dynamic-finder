module.exports = Model => {

	class FinderQueryBuilder extends Model.QueryBuilder {

		get finder() {
			let queryString = null

			// The proxy adds a getter for a query string.
			// Upon calling the proxy function, the string is parsed into `where` statements
			const proxy = new Proxy((...args) => {
				let whereTerm = 'where'
				let offsetLetter = ''
				let argCount = 0
				const schema = this._modelClass.$$jsonSchema || this._modelClass.jsonSchema
				const hasSchema = schema && schema.properties

				// For queryStrings that end in 'OrFail', fail if no models are found ex. firstNameOrFail
				if(queryString.slice(-6) === 'OrFail') {
					this._failIfNotFound()
					queryString = queryString.slice(0, -6)
				}

				// Test for beginning 'or' statement ex. orFirstname
				if(/^or[A-Z]/.test(queryString)) {
					queryString = queryString[2].toLowerCase() + queryString.slice(3)
					whereTerm = 'orWhere'
				}

				// Split on 'And' or 'Or', using capture groups to keep them in the result set
				for(const term of queryString.split(/(?:(Or|And)([A-Z]))/)) {
					if(term.length === 1) {

						// Corrects for issue splitting on capture groups
						offsetLetter = term
						continue
					} else if((term === 'And') || (term === 'Or')) {
						whereTerm = term === 'And' ? 'where' : 'orWhere'
						continue
					}

					// Convert query string from camelCase to snake_case
					const cameled = (offsetLetter.toLowerCase() + term)
					const searchField = cameled.replace(/(.)([A-Z])/, '$1_$2').toLowerCase()

					// If a jsonSchema is defined on the model, use it to validate that the queried fields exist
					if(hasSchema) {
						if((schema.properties[searchField] === void 0) && (schema.properties[cameled] === void 0)) {
							throw new Error(
								`Querying invalid field: ${searchField}. Please fix the query or update the jsonSchema.`
							)
						}
					}

					// Add the where() query
					this[whereTerm](searchField, args[argCount ++])
				}

				// returns the QueryBuilder to support further query chaining
				return this
			}, {
				get: (object, prop) => {
					queryString = prop

					// Return the proxy so it can then be called
					return proxy
				}
			})

			// Returns the proxy to allow accces to the getter
			return proxy
		}

		// Use throwIfNotFound on Objection >= 0.8.1. Else mimic its basic functionality.
		_failIfNotFound() {
			if(typeof this.throwIfNotFound === 'function') {
				return this.throwIfNotFound()
			}

			return this.runAfter(result => {
				if(Array.isArray(result) && result.length === 0) {
					throw new Error('No models found')
				} else if([ null, undefined, 0 ].includes(result)) {
					throw new Error('No models found')
				}

				return result
			})
		}

	}

	return class extends Model {
		static get QueryBuilder() {
			return FinderQueryBuilder
		}

	}
}
