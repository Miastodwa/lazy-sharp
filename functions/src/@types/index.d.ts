import { ResizeOptions } from 'sharp'

export interface Preset extends ResizeOptions {
	format?: QueryParams['format']
}

export interface Presets {
	[PresetName: string]: Preset
}

export interface QueryParams {
	bucket?: string
	ref?: string
	result?: 'url' | 'redirect'
	format?: 'webp' | 'jpeg' | 'png'
	cacheControl?: string
	preset?: string
	width?: ResizeOptions['width']
	height?: ResizeOptions['height']
	fit?: ResizeOptions['fit']
	position?: ResizeOptions['position']
	background?: string
	withoutEnlargement?: boolean
}
