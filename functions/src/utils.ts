import * as sharp from 'sharp'

export function replaceExt(filename, ext) {
    const pos = filename.lastIndexOf('.')
    return filename.substr(0, pos < 0 ? filename.length : pos) + '.' + ext
}

export function parseFolder(folder: string): string {
    if (!folder) return ''
    if (folder.endsWith('/')) return folder
    else return folder + '/'
}

export function buildPrefix(options: sharp.ResizeOptions): string {
	return Object.keys(options).reduce(
		(acc, key) => {
			if (!options[key]) return acc
			if (!acc) return `${key}:${options[key]}`
			return `${acc},${key}:${options[key]}`
		}, null
	)
}

export async function buidlPipeline(
    options: sharp.ResizeOptions,
    format: string | sharp.AvailableFormatInfo
) {
    const { width, height } = options

	try {
		return await sharp().resize( width, height, options).toFormat(format)
	} catch (error) {
		console.log(error)
		throw error
	}
}
