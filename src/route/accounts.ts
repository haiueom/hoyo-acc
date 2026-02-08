import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { Account, ApiResponse } from '../types'

const app = new Hono<{ Bindings: Env }>()

// Schema Validasi dengan Zod
const createAccountSchema = z.object({
	name: z.string().min(1, 'Name is required'),
	cookie_token: z.string().min(1, 'Cookie token is required'),
	account_id: z.number().int('Account ID must be an integer'),
})

const updateAccountSchema = z.object({
	name: z.string().min(1).optional(),
	cookie_token: z.string().min(1).optional(),
	account_id: z.number().int().optional(),
})

// GET All Accounts
app.get('/', async (c) => {
	const db = c.env.DB
	const { results } = await db
		.prepare('SELECT * FROM accounts ORDER BY created_at DESC')
		.all<Account>()

	return c.json<ApiResponse>({
		success: true,
		message: 'Accounts retrieved successfully',
		data: results,
	})
})

// GET Single Account
app.get('/:id', async (c) => {
	const id = c.req.param('id')
	const account = await c.env.DB.prepare(
		'SELECT * FROM accounts WHERE id = ?',
	)
		.bind(id)
		.first<Account>()

	if (!account) {
		return c.json<ApiResponse>(
			{
				success: false,
				message: 'Account not found',
				error: `Account with ID ${id} does not exist`,
			},
			404,
		)
	}

	return c.json<ApiResponse>({
		success: true,
		message: 'Account retrieved successfully',
		data: account,
	})
})

// POST Create Account
app.post('/', zValidator('json', createAccountSchema), async (c) => {
	const body = c.req.valid('json')
	const db = c.env.DB

	try {
		// Menggunakan RETURNING * untuk efisiensi (hanya 1 query)
		const newAccount = await db
			.prepare(
				'INSERT INTO accounts (name, cookie_token, account_id) VALUES (?, ?, ?) RETURNING *',
			)
			.bind(body.name, body.cookie_token, body.account_id)
			.first<Account>()

		return c.json<ApiResponse>(
			{
				success: true,
				message: 'Account created successfully',
				data: newAccount || undefined,
			},
			201,
		)
	} catch (error: any) {
		// Menangani error Unique Constraint (account_id sudah ada)
		if (
			error.message &&
			error.message.includes('UNIQUE constraint failed')
		) {
			return c.json<ApiResponse>(
				{
					success: false,
					message: 'Account already exists',
					error: `Account with account_id ${body.account_id} already exists`,
				},
				409,
			)
		}
		throw error // Lempar ke global error handler
	}
})

// PUT Update Account
app.put('/:id', zValidator('json', updateAccountSchema), async (c) => {
	const id = c.req.param('id')
	const body = c.req.valid('json')

	// Cek jika body kosong
	if (Object.keys(body).length === 0) {
		return c.json<ApiResponse>(
			{ success: false, message: 'No fields to update' },
			400,
		)
	}

	const db = c.env.DB
	const updated_at = new Date().toISOString()

	// Membangun query dinamis
	const keys = Object.keys(body) as Array<keyof typeof body>
	const setClause = keys.map((key) => `${key} = ?`).join(', ')
	const values = keys.map((key) => body[key])

	// Query: UPDATE ... SET name=?, updated_at=? WHERE id=? RETURNING *
	const query = `UPDATE accounts SET ${setClause}, updated_at = ? WHERE id = ? RETURNING *`

	try {
		const updatedAccount = await db
			.prepare(query)
			.bind(...values, updated_at, id)
			.first<Account>()

		if (!updatedAccount) {
			return c.json<ApiResponse>(
				{
					success: false,
					message: 'Account not found or no changes made',
					error: `Account with ID ${id} not found`,
				},
				404,
			)
		}

		return c.json<ApiResponse>({
			success: true,
			message: 'Account updated successfully',
			data: updatedAccount,
		})
	} catch (error: any) {
		if (
			error.message &&
			error.message.includes('UNIQUE constraint failed')
		) {
			return c.json<ApiResponse>(
				{
					success: false,
					message: 'Update failed',
					error: `Account ID conflicts with existing account`,
				},
				409,
			)
		}
		throw error
	}
})

// DELETE Account
app.delete('/:id', async (c) => {
	const id = c.req.param('id')
	const db = c.env.DB

	// Gunakan RETURNING id untuk memastikan sesuatu benar-benar terhapus
	const result = await db
		.prepare('DELETE FROM accounts WHERE id = ? RETURNING id')
		.bind(id)
		.first()

	if (!result) {
		return c.json<ApiResponse>(
			{
				success: false,
				message: 'Account not found',
				error: `Account with ID ${id} does not exist`,
			},
			404,
		)
	}

	return c.json<ApiResponse>({
		success: true,
		message: 'Account deleted successfully',
		data: { id },
	})
})

export default app
