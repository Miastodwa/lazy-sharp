import * as sharp from 'sharp'

export function splitFileName(filename: string) {
	const ext = /(?:\.([^.]+))?$/.exec(filename)
	return [filename.slice(0, -ext[0].length), ext[1]]
}

export function buildSufix(options: sharp.ResizeOptions): string {
	return Object.keys(options).reduce((acc, key) => {
		if (!options[key]) {
			return acc
		}
		if (!acc) {
			return `${key}:${options[key]}`
		}
		return `${acc},${key}:${options[key]}`
	}, null)
}

export async function buildPipeline(
	options: sharp.ResizeOptions,
	format: string | sharp.AvailableFormatInfo
) {
	const { width, height } = options

	try {
		return await sharp()
			.resize(width, height, options)
			.toFormat(format)
	} catch (error) {
		throw error
	}
}

export function waited(t) {
	return (Date.now() - t) / 1000
}
