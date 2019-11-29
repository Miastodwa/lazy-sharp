import * as sharp from 'sharp'
import { Preset, QueryParams } from './@types'
import presets from './presets'

export const FORMATS = ['jpeg', 'png', 'webp']
export const CACHE_CONTROL = 'public, max-age=31536000'

export const splitFileName = (filename: string) => {
	const ext = /(?:\.([^.]+))?$/.exec(filename)
	return [filename.slice(0, -ext[0].length), ext[1]]
}

export const generateSufix = (options: sharp.ResizeOptions): string => {
	return Object.keys(options).reduce((acc, key) => {
		if (!options[key]) {
			return acc
		}
		if (!acc) {
			return `${key}:${options[key]}`
		}
		return `${acc},${key}:${options[key]}`
	}, '')
}

export const getPreset = ({ preset }: QueryParams): Preset => {
	return preset && presets[preset]
}

export const getFileFormat = (query: QueryParams) => {
	const preset = getPreset(query)
	if (preset && preset.format && FORMATS.includes(preset.format)) {
		return preset.format
	} else if (FORMATS.includes(query.format)) {
		return query.format
	}
	return 'jpeg'
}

export const getFileParams = (query: QueryParams) => {
	const fileFormat = getFileFormat(query)
	return {
		bucket: query.bucket,
		ref: query.ref,
		result: query.result || 'redirect',
		format: fileFormat,
		cacheControl: query.cacheControl || CACHE_CONTROL,
	}
}

export const getResizeOptions = (query: QueryParams): sharp.ResizeOptions => {
	const presetOptions = getPreset(query)
	if (presetOptions) {
		delete presetOptions.format
		return presetOptions
	}
	return {
		width: +query.width || null,
		height: +query.height || null,
		fit: query.fit,
		position: query.position,
		background: query.background,
		withoutEnlargement: query.withoutEnlargement,
	}
}

export const buildPipeline = async (
	options: sharp.ResizeOptions,
	format: string | sharp.AvailableFormatInfo
) => {
	const { width, height } = options

	try {
		return await sharp()
			.resize(width, height, options)
			.toFormat(format)
	} catch (error) {
		throw error
	}
}
