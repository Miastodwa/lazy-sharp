import { config, Response } from 'firebase-functions'
import * as sharp from 'sharp'
import { Preset, QueryParams } from './@types'
import presets from './presets'

export const FORMATS = ['jpeg', 'png', 'webp']
export const CACHE_CONTROL = 'public, max-age=31536000'
export const FB_STORAGE_URL = 'https://firebasestorage.googleapis.com/v0'

const {
	settings: { presets_only, mode },
} = config()

export const splitFileName = (filename: string) => {
	const ext = /(?:\.([^.]+))?$/.exec(filename)
	return [filename.slice(0, -ext[0].length), ext[1]]
}

export const generateSufix = (
	options?: sharp.ResizeOptions,
	preset?: string
): string => {
	const presetConfig = getPreset(preset)
	if (preset && presetConfig) {
		return `__preset:${preset}__`
	}
	const sufix = Object.keys(options).reduce((acc, key) => {
		if (!options[key]) {
			return acc
		}
		if (!acc) {
			return `${key}:${options[key]}`
		}
		return `${acc},${key}:${options[key]}`
	}, '')
	if (sufix) {
		return `__${sufix}__`
	}
	return ''
}

export const getPreset = (preset: string): Preset => {
	const selectedPreset = preset && presets[preset]
	if (!!presets_only) {
		return selectedPreset || {}
	}
	return selectedPreset
}

export const getFileFormat = ({ preset, format }: QueryParams) => {
	const presetConfig = getPreset(preset)
	if (
		presetConfig &&
		presetConfig.format &&
		FORMATS.includes(presetConfig.format)
	) {
		return presetConfig.format
	} else if (FORMATS.includes(format)) {
		return format
	}
	return 'jpeg'
}

export const getFileParams = (query: QueryParams) => {
	const fileFormat = getFileFormat(query)
	return {
		bucket: query.bucket,
		path: query.path,
		result: query.result || 'redirect',
		format: fileFormat,
		cacheControl: query.cacheControl || CACHE_CONTROL,
	}
}

export const getResizeOptions = (query: QueryParams): sharp.ResizeOptions => {
	const presetConfig = getPreset(query.preset)
	if (presetConfig) {
		delete presetConfig.format
		return presetConfig
	}
	return {
		width: +query.width || null,
		height: +query.height || null,
		fit: query.fit,
		position: query.position,
		background: query.background,
		withoutEnlargement: query.withoutEnlargement === 'true',
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

export const FbResourceUrl = (bucket: string, path: string) => {
	const encodedPath = encodeURIComponent(path)
	return `${FB_STORAGE_URL}/b/${bucket}/o/${encodedPath}`
}

export const successfulResponse = (
	res: Response,
	result: QueryParams['result'],
	url: string
) => {
	if (result === 'url') {
		return res.send(url)
	} else {
		return res.redirect(301, `${url}?alt=media`)
	}
}

export const unhandledRejections = (res: Response) => {
	// process unhandled rejections and log them in dev
	process.on('unhandledRejection', error => {
		if (mode !== 'development') {
			return res.status(500).send('unhandledRejection')
		}
		console.error('unhandledRejection', error)
		return res.status(500).send(error)
	})
}
