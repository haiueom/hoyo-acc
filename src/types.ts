export interface Account {
	id: number
	name: string
	cookie_token: string
	account_id: number
	created_at: string
	updated_at: string
}

export interface ApiResponse<T = unknown> {
	success: boolean
	message: string
	data?: T
	error?: string
}

export interface ApiQuranVerseResponse {
	surahName: string
	surahNameArabic: string
	surahNameArabicLong: string
	surahNameTranslation: string
	revelationPlace: string
	totalAyah: number
	surahNo: number
	ayahNo: number
	audio: Record<
		string,
		{
			reciter: string
			url: string
			originalUrl: string
		}
	>
	english: string
	arabic1: string
	arabic2: string
	bengali: string
	urdu: string
}
