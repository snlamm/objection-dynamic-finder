import test from 'ava'
import knex from 'knex'
import { Model } from 'objection'
import Finder from '../index.js'

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

test('Using a single field', async t => {
	const persons = await Person.query().finder.firstName('John')

	t.is(persons[0].first_name, 'John')
})

test('Using multiple fields with "and"', async t => {
	const persons = await Person.query().finder.firstNameAndLastName('John', 'Smith')

	t.is(persons.length, 1)
	t.is(persons[0].last_name, 'Smith')
})

test('Using multiple fields with "or"', async t => {
	const persons = await Person.query().finder.firstNameAndEmailOrLastName('Jane', 'jane@ccc.com', 'Adams')
	const person = await Person.query().finder.firstNameAndEmailOrLastName('Jane', 'john.adam@xyz.com', 'Adams')

	t.is(persons.length, 2)

	const lastNames = persons.map(person => person.last_name)
	t.is(lastNames.includes('Adams'), true)
	t.is(lastNames.includes('Quincy'), true)

	t.is(person.length, 1)
	t.is(person[0].last_name, 'Adams')
})

test('Using a beginning "or"', async t => {
	const personsQuery = Person.query()
	personsQuery.where('email', 'john.adam@xyz.com')
	personsQuery.finder.orFirstName('Jane')

	const persons = await personsQuery

	t.is(persons.length, 2)

	const lastNames = persons.map(person => person.last_name)
	t.is(lastNames.includes('Adams'), true)
	t.is(lastNames.includes('Quincy'), true)
})

test('Find or fail', async t => {
	const personsQuery = Person.query().finder.firstNameOrFail('Jim')

	try {
		await personsQuery
		t.fail()
	} catch(err) {
		t.is(err.message, 'NotFoundError')
	}
})

test('Querying on a non-existing field fails', async t => {

	try {
		await Person.query().finder.asdfead('Jane')
		t.fail()
	} catch(err) {
		t.is(err.message, 'NotFoundError')
		t.is(err.data.trim(), 'Querying invalid field: asdfead. Please fix the query or update your jsonSchema.')
	}
})

test('Continue chaining queries on top of finder', async t => {
	const person = await Person.query().finder.firstName('Jane').where('last_name', 'Quincy').first()

	t.is(person.first_name, 'Jane')
})

test.before(async() => {
	await db.schema.createTableIfNotExists('persons', table => {
		table.increments('id').primary()
		table.string('first_name')
		table.string('last_name')
		table.string('email')
	})

	await db('persons').delete()
	await Person.query().insert({ first_name: 'John', last_name: 'Smith', email: 'john.smith@xyz.com' })
	await Person.query().insert({ first_name: 'John', last_name: 'Adams', email: 'john.adam@xyz.com' })
	return Person.query().insert({ first_name: 'Jane', last_name: 'Quincy', email: 'jane@ccc.com' })
})

test.after(async() => {
	await db.schema.dropTable('persons')
	return db.destroy()
})
