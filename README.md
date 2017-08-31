# objection-dynamic-finder

<a href="https://travis-ci.org/snlamm/objection-dynamic-finder"><img src="https://travis-ci.org/snlamm/objection-dynamic-finder.svg?branch=master" alt="Build Status"></a>
<a href='https://coveralls.io/github/snlamm/objection-dynamic-finder?branch=master'><img src='https://coveralls.io/repos/github/snlamm/objection-dynamic-finder/badge.svg?branch=master' alt='Coverage Status' /></a>
<a href="https://www.npmjs.com/package/objection-dynamic-finder"><img src="https://img.shields.io/gemnasium/mathiasbynens/he.svg" alt="Dependencies"></a>
<a href="https://www.npmjs.com/package/objection-dynamic-finder"><img src="https://img.shields.io/npm/v/objection-dynamic-finder.svg" alt="NPM Version"></a>
<a href="https://www.npmjs.com/package/objection-dynamic-finder"><img src="https://img.shields.io/npm/l/objection-dynamic-finder.svg" alt="License"></a>

An Objection.js plugin for using convenient finders inspired by Rails's [dynamic finders](http://guides.rubyonrails.org/active_record_querying.html#dynamic-finders).

## Examples

```js
Person.query().finder.firstNameAndLastName('John', 'Smith')
// => Person.query().where('first_name', 'John').where('last_name', 'Smith')

Person.query().finder.isDisabledOrStatus(true, 'failed')
// => Person.query().where('is_disabled', true).orWhere('status', 'failed')

Person.query().finder.firstNameOrFail('Jane')
// If no model is returned, throws an error (uses throwIfNotFound() in Objection > 0.8.1)

Person.query().finder.firstNameAndNonExistingField('foo')
// => NotFoundError 'Querying invalid field: non_existing_field'
// The query fields will be validated against Person model's jsonSchema, if it has one.

Person.query().avg('income').finder.lastNameAndCountry('Smith', 'USA').where('age', '<', 30)
// Finders can be chained with all other QueryBuilder methods.
```

## Installation
Due to [Babel not handling](http://babeljs.io/learn-es2015/#ecmascript-2015-features-proxies) the Proxy object, this plugin is only compatible with Node versions >= 6.0.0.

Add the `objection-dynamic-finder` package via your preferred package manager:

```shell
npm install --save objection-dynamic-finder
```

## Usage

See Objection.js [docs](http://vincit.github.io/objection.js/#plugin-development-best-practices) on using plugins. Once the plugin is applied to a Model class, that class can use `.finder` in queries.

```js
const Finder = require('objection-dynamic-finder')
const Model = require('objection').Model

class Person extends Finder(Model) {
	// ...
}

```

## Validation Using jsonSchemas

_If_ a class has a jsonSchema property defined then the fields in in the finder will be validated against the schema to make sure they exist on the model. Make sure the schema is up to date! CamelCase and snake_case property names are both supported.

## Contributing
Contributions are always welcome. You are encouraged to open issues and merge requests.

To run the tests, use `npm run test`.
