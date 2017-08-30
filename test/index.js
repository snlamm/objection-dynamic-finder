const test = require('ava')
const knex = require('knex')
const Model = require('objection').Model
const Finder = require('../index.js')

// create knex connection to database
const db = knex({
	client: 'sqlite3',
	connection: { filename: './test/test.db' },
	useNullAsDefault: true
})

// bind knex instance to objection
Model.knex(db)

class Person extends Finder(Model) {
	static get tableName() {
		return 'persons'
	}

	static get jsonSchema() {
		return {
			properties: {
				id: { type: 'integer' },
				firstName: { type: 'string' },
				lastName: { type: 'string' },
				email: { type: 'string' }
			}
		}
	}
}

test('Using a single field', t => {
	return Person.query().finder.firstName('John').then(persons => {
		t.is(persons[0].first_name, 'John')
	})
})

test('Using multiple fields with "and"', t => {
	return Person.query().finder.firstNameAndLastName('John', 'Smith').then(persons => {
		t.is(persons.length, 1)
		t.is(persons[0].last_name, 'Smith')
	})
})

test('Using multiple fields with "or"', t => {
	return Promise.all([
		Person.query().finder.firstNameAndEmailOrLastName('Jane', 'jane@ccc.com', 'Adams'),
		Person.query().finder.firstNameAndEmailOrLastName('Jane', 'john.adam@xyz.com', 'Adams')
	]).then(([ persons, person ]) => {
		t.is(persons.length, 2)

		const lastNames = persons.map(person => person.last_name)
		t.is(lastNames.includes('Adams'), true)
		t.is(lastNames.includes('Quincy'), true)

		t.is(person.length, 1)
		t.is(person[0].last_name, 'Adams')
	})
})

test('Using a beginning "or"', t => {
	const personsQuery = Person.query()
	personsQuery.where('email', 'john.adam@xyz.com')
	personsQuery.finder.orFirstName('Jane')

	return personsQuery.then(persons => {
		t.is(persons.length, 2)

		const lastNames = persons.map(person => person.last_name)
		t.is(lastNames.includes('Adams'), true)
		t.is(lastNames.includes('Quincy'), true)
	})
})

test('Find or fail', t => {
	const personsQuery = Person.query().finder.firstNameOrFail('Jim')

	return personsQuery.then(() => t.fail())
		.catch(err => {
			t.is(err.message, 'NotFoundError')
		})

})

test('Querying on a non-existing field fails', t => {

	try {
		Person.query().finder.asdfead('Jane')
		t.fail()
	} catch(err) {
		t.is(err.message, 'NotFoundError')
		t.is(err.data.trim(), 'Querying invalid field: asdfead. Please fix the query or update your jsonSchema.')
	}
})

test('Continue chaining queries on top of finder', t => {
	return Person.query().finder.firstName('John').where('last_name', 'Adams').first().then(person => {
		t.is(person.last_name, 'Adams')
	})
})

test.before(() => {
	return db.schema.createTableIfNotExists('persons', table => {
		table.increments('id').primary()
		table.string('first_name')
		table.string('last_name')
		table.string('email')
	}).then(() => {
		return db('persons').delete()
	}).then(() => {
		return Promise.all([
			Person.query().insert({ first_name: 'John', last_name: 'Smith', email: 'john.smith@xyz.com' }),
			Person.query().insert({ first_name: 'John', last_name: 'Adams', email: 'john.adam@xyz.com' }),
			Person.query().insert({ first_name: 'Jane', last_name: 'Quincy', email: 'jane@ccc.com' })
		])
	})
})

test.after(() => {
	return db.schema.dropTable('persons').then(() => db.destroy())
})
