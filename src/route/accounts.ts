import { Hono } from 'hono'
import { Account, ApiResponse } from '../types'

const app = new Hono<{ Bindings: Env }>()

app.get('/', async (c) => {
	try {
		const db = c.env.DB
		const result = await db
			.prepare('SELECT * FROM accounts ORDER BY created_at DESC')
			.all<Account>()

		return c.json<ApiResponse>({
			success: true,
			message: 'Accounts retrieved successfully',
			data: result.results,
		})
	} catch (error) {
		return c.json<ApiResponse>({
			success: false,
			message: 'Failed to retrieve accounts',
			error: error instanceof Error ? error.message : 'Unknown error',
		})
	}
})

app.get('/:id', async (c) => {
	try {
		const id = c.req.param('id')
		const db = c.env.DB
		const result = await db
			.prepare('SELECT * FROM accounts WHERE id = ?')
			.bind(id)
			.first<Account>()

		if (!result) {
			return c.json<ApiResponse>({
				success: false,
				message: 'Account not found',
				error: `Account with ID ${id} does not exist`,
			})
		}

		return c.json<ApiResponse>({
			success: true,
			message: 'Account retrieved successfully',
			data: result,
		})
	} catch (error) {
		return c.json<ApiResponse>({
			success: false,
			message: 'Failed to retrieve account',
			error: error instanceof Error ? error.message : 'Unknown error',
		})
	}
})

app.post('/', async (c) => {
	try {
		const body = (await c.req.json()) as Partial<Account>

		// Validation
		if (!body.name || typeof body.name !== 'string') {
			return c.json<ApiResponse>({
				success: false,
				message: 'Validation failed',
				error: "Field 'name' is required and must be a string",
			})
		}
		if (!body.cookie_token || typeof body.cookie_token !== 'string') {
			return c.json<ApiResponse>({
				success: false,
				message: 'Validation failed',
				error: "Field 'cookie_token' is required and must be a string",
			})
		}
		if (!body.account_id || typeof body.account_id !== 'number') {
			return c.json<ApiResponse>({
				success: false,
				message: 'Validation failed',
				error: "Field 'account_id' is required and must be a number",
			})
		}

		const db = c.env.DB

		// check for existing account with the same account_id
		// const existingAccount = await db
		// 	.prepare('SELECT * FROM accounts WHERE account_id = ?')
		// 	.bind(body.account_id)
		// 	.first<Account>()
		// if (existingAccount) {
		// 	return c.json<ApiResponse>(
		// 		{
		// 			success: false,
		// 			message: 'Account already exists',
		// 			error: `Account with account_id ${body.account_id} already exists`,
		// 		},
		// 		409,
		// 	)
		// }

		await db
			.prepare(
				'INSERT INTO accounts (name, cookie_token, account_id) VALUES (?, ?, ?)',
			)
			.bind(body.name, body.cookie_token, body.account_id)
			.run()

		const newAccount: Account = {
			name: body.name,
			cookie_token: body.cookie_token,
			account_id: body.account_id,
		}

		return c.json<ApiResponse>({
			success: true,
			message: 'Account created successfully',
			data: newAccount,
		})
	} catch (error) {
		return c.json<ApiResponse>({
			success: false,
			message: 'Failed to create account',
			error: error instanceof Error ? error.message : 'Unknown error',
		})
	}
})

app.put('/:id', async (c) => {
	try {
		const id = c.req.param('id')
		const db = c.env.DB
		const existingAccount = await db
			.prepare('SELECT * FROM accounts WHERE id = ?')
			.bind(id)
			.first<Account>()

		if (!existingAccount) {
			return c.json<ApiResponse>({
				success: false,
				message: 'Account not found',
				error: `Account with ID ${id} does not exist`,
			})
		}

		const body = (await c.req.json()) as Partial<Account>
		const updated_at = new Date().toISOString()

		// Update only provided fields
		let updateQuery = 'UPDATE accounts SET updated_at = ?'
		const params: (string | number | null)[] = [updated_at]

		if (body.name !== undefined) {
			if (typeof body.name !== 'string') {
				return c.json<ApiResponse>({
					success: false,
					message: 'Validation failed',
					error: "Field 'name' must be a string",
				})
			}
			updateQuery += ', name = ?'
			params.push(body.name)
		}

		if (body.cookie_token !== undefined) {
			if (typeof body.cookie_token !== 'string') {
				return c.json<ApiResponse>({
					success: false,
					message: 'Validation failed',
					error: "Field 'token' must be a string",
				})
			}
			updateQuery += ', cookie_token = ?'
			params.push(body.cookie_token)
		}

		if (body.account_id !== undefined) {
			if (typeof body.account_id !== 'number') {
				return c.json<ApiResponse>({
					success: false,
					message: 'Validation failed',
					error: "Field 'account_id' must be a number",
				})
			}
			updateQuery += ', account_id = ?'
			params.push(body.account_id)
		}

		updateQuery += ' WHERE id = ?'
		params.push(id)

		await db
			.prepare(updateQuery)
			.bind(...params)
			.run()

		const updatedAccount = await db
			.prepare('SELECT * FROM accounts WHERE id = ?')
			.bind(id)
			.first<Account>()

		return c.json<ApiResponse>({
			success: true,
			message: 'Account updated successfully',
			data: updatedAccount || undefined,
		})
	} catch (error) {
		return c.json<ApiResponse>({
			success: false,
			message: 'Failed to update account',
			error: error instanceof Error ? error.message : 'Unknown error',
		})
	}
})

app.delete('/:id', async (c) => {
	try {
		const id = c.req.param('id')
		const db = c.env.DB
		const account = await db
			.prepare('SELECT * FROM accounts WHERE id = ?')
			.bind(id)
			.first<Account>()

		if (!account) {
			return c.json<ApiResponse>({
				success: false,
				message: 'Account not found',
				error: `Account with ID ${id} does not exist`,
			})
		}

		await db.prepare('DELETE FROM accounts WHERE id = ?').bind(id).run()

		return c.json<ApiResponse>({
			success: true,
			message: 'Account deleted successfully',
			data: { id },
		})
	} catch (error) {
		return c.json<ApiResponse>({
			success: false,
			message: 'Failed to delete account',
			error: error instanceof Error ? error.message : 'Unknown error',
		})
	}
})

export default app
