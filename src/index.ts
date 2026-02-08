import { Hono } from 'hono'
import { bearerAuth } from 'hono/bearer-auth'
import accounts from './route/accounts'
import { ApiQuranVerseResponse, ApiResponse } from './types'

const app = new Hono<{ Bindings: Env }>()

// Global Error Handler
app.onError((err, c) => {
	console.error(`${err}`)
	return c.json<ApiResponse>(
		{
			success: false,
			message: 'Internal Server Error',
			error: err.message,
		},
		500,
	)
})

// Middleware Auth untuk rute /api/accounts/*
app.use('/api/accounts/*', async (c, next) => {
	// Pastikan SECRET_KEY ada
	if (!c.env.SECRET_KEY) {
		return c.json(
			{ success: false, message: 'Server configuration error' },
			500,
		)
	}
	const auth = bearerAuth({ token: c.env.SECRET_KEY })
	return auth(c, next)
})

app.get('/', async (c) => {
	try {
		const ayah = Math.floor(Math.random() * 7) + 1
		// Menambahkan timeout agar tidak hang jika API luar down
		const response = await fetch(
			`https://quranapi.pages.dev/api/1/${ayah}.json`,
			{
				signal: AbortSignal.timeout(5000), // 5 detik timeout
			},
		)

		if (!response.ok) throw new Error('Failed to fetch verse')

		const data = (await response.json()) as ApiQuranVerseResponse

		return c.json({
			arabic: data.arabic1,
			english: data.english,
			surah: data.surahName,
			ayah: data.ayahNo,
		})
	} catch (error) {
		return c.json<ApiResponse>(
			{
				success: false,
				message: 'Failed to retrieve verse',
				error: error instanceof Error ? error.message : 'Unknown error',
			},
			502,
		) // Bad Gateway
	}
})

app.get('/api', (c) =>
	c.json<ApiResponse>({
		success: true,
		message: 'API is running.',
	}),
)

app.route('/api/accounts', accounts)

export default app
