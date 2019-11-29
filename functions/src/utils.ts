import * as sharp from 'sharp'
import { Preset } from './@types'
import { QueryParams } from './@types/index.d'
import presets from './presets'
const PRESET_ONLY = false

export function splitFileName(filename: string) {
	const ext = /(?:\.([^.]+))?$/.exec(filename)
	return [filename.slice(0, -ext[0].length), ext[1]]
}

export function generateSufix(options: sharp.ResizeOptions): string {
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

export function getPreset({ preset }: QueryParams): Preset {
	return preset && presets[preset]
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
