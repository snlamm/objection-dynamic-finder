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

				// For queryStrings that end in 'OrFail', fail if no models are found ex. firstNameOrFail
				if(queryString.slice(-6) === 'OrFail') {
					this.throwIfNotFound()
					queryString = queryString.slice(0, -6)
				}

				// Test for beginning 'or' statement ex. orFirstname
				if(/^or[A-Z]/.test(queryString)) {
					queryString = queryString.slice(2)
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

					// Parse out field to search on and convert from camelCase to snake_case
					const searchField = (offsetLetter + term).replace(/(.)([A-Z])/, '$1_$2').toLowerCase()

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
	}

	return class extends Model {
		static get QueryBuilder() {
			return FinderQueryBuilder
		}

	}
}
