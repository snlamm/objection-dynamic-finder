module.exports = Model => {

	class FinderQueryBuilder extends Model.QueryBuilder {

		_buildDynamicFinder(queryString) {
			const buildResults = {
				shouldErrorOnFail: false,
				isFailedSchemaValidation: false,
				searchFields: [ ]
			}
			let whereTerm = 'where'
			let offsetLetter = ''

			const schema = this.modelClass().getJsonSchema()
			const hasSchema = schema && schema.properties

			if(!hasSchema) {
				throw new Error('Attempting to use dynamic finders without a jsonSchema. Please define it')
			}

			// For queryStrings that end in 'OrFail', fail if no models are found ex. firstNameOrFail
			if(queryString.slice(-6) === 'OrFail') {
				buildResults.shouldErrorOnFail = true
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
				const fullTerm = offsetLetter.toLowerCase() + term
				const cameled = fullTerm[0].toLowerCase() + fullTerm.slice(1)
				const searchField = cameled.replace(/(.)([A-Z])/, '$1_$2').toLowerCase()

				// If a jsonSchema is defined on the model, use it to validate that the queried fields exist.
				if((schema.properties[searchField] === void 0) && (schema.properties[cameled] === void 0)) {
					buildResults.isFailedSchemaValidation = true
					return buildResults
				}

				// Add the components for the where query
				buildResults.searchFields.push([ whereTerm, searchField ])
			}

			return buildResults
		}

		_doDynamicFinder(shouldErrorOnFail, searchFields, ...args) {
			if(shouldErrorOnFail) {
				this._failIfNotFound()
			}

			let argCount = 0

			// Add the where() queries
			for(const [ whereTerm, searchField ] of searchFields) {
				this[whereTerm](searchField, args[argCount ++])
			}

			return this
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

		static query(...args) {
			const queryBuilder = super.query(...args)

			return new Proxy(queryBuilder, {
				get: (target, propKey) => {
					if(propKey in target) {
						return target[propKey]
					}

					const {
						isFailedSchemaValidation,
						searchFields,
						shouldErrorOnFail
					} = target._buildDynamicFinder(propKey)

					if(isFailedSchemaValidation) {
						return void 0
					}

					return function(...args) {
						return target._doDynamicFinder(shouldErrorOnFail, searchFields, ...args)
					}
				}
			})
		}

	}

}
