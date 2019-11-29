import { ResizeOptions } from 'sharp'

declare type ResultFormat = 'webp' | 'jpeg' | 'png'

export interface Preset extends ResizeOptions {
	format?: ResultFormat
}

export interface Presets {
	[PresetName: string]: Preset
}

export interface QueryParams {
	bucket?: string
	ref?: string
	result?: string
	format?: string
	cacheControl?: string
	preset?: string
	width?: ResizeOptions['width']
	height?: ResizeOptions['height']
	fit?: ResizeOptions['fit']
	position?: ResizeOptions['position']
	background?: string
	withoutEnlargement?: boolean
}
