import { Hono } from 'hono'
import accounts from './route/accounts'
import { bearerAuth } from 'hono/bearer-auth'
import { ApiQuranVerseResponse, ApiResponse } from './types'

const app = new Hono<{ Bindings: Env }>()

app.get('/', async (c) => {
	const ayah = Math.floor(Math.random() * 7) + 1
	const data = (await (
		await fetch(`https://quranapi.pages.dev/api/1/${ayah}.json`)
	).json()) as ApiQuranVerseResponse
	const ini = {
		arabic: data.arabic1,
		english: data.english,
		surah: data.surahName,
		ayah: data.ayahNo,
	}
	return c.json(ini)
})

app.get('/api', (c) =>
	c.json<ApiResponse>({
		success: true,
		message: 'API is running.',
	}),
)

app.use('/api/accounts/*', (c, next) =>
	bearerAuth({ token: c.env.SECRET_KEY })(c, next),
)
app.route('/api/accounts', accounts)

export default app
