type SharpGravity = 'north' | 'northeast' | 'east' | 'southeast' | 'south' | 'southwest' | 'west' | 'northwest' | 'center'
type SharpStrategy = 'entropy' | 'attention'
type ResizeLimit = 'min' | 'max'
type SharpFormat = 'jpeg' | 'png' | 'webp'
type TransformResult = 'url' | 'redirect' | 'stream'

export interface SharpParams {
	resize?: number[]
	resizeLimit?: ResizeLimit
	crop?: SharpGravity | SharpStrategy | false
	embed?: SharpGravity | false
	toFormat?: SharpFormat
}

export interface TransformParams {
	bucket: string
	folder: string
	name: string
	result?: TransformResult
	sharp?: SharpParams
}