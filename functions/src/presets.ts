import { Presets } from './@types'

const presets: Presets = {
	default: {},
	portfolio: {
		width: 560,
		height: 420,
		format: 'webp',
	},
	full_size: {
		width: 960,
		height: 720,
		fit: 'inside',
		format: 'webp',
	},
	map_preview: {
		width: 160,
		height: 104,
		format: 'webp',
	},
	profile_roll: {
		width: 240,
		height: 160,
		format: 'webp',
	},
	list_item: {
		width: 300,
		height: 200,
		format: 'webp',
	},
	micro: {
		width: 30,
		height: 20,
		format: 'webp',
	},
}

export default presets
