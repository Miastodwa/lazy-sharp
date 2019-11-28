import { ResizeOptions, Sharp } from 'sharp'
import { buildPipeline, buildSufix, splitFileName } from '../utils'
const resizeOptions: ResizeOptions = {
	width: 300,
	height: null,
	fit: 'contain',
	position: 'top',
	background: 'pink',
	withoutEnlargement: true,
}

test('split file name', () => {
	const ref = 'folder/subfolder/image.webp'
	const [path, ext] = splitFileName(ref)
	expect(path).toBe('folder/subfolder/image')
	expect(ext).toBe('webp')
})

test('create a suffix', () => {
	const suffix = buildSufix(resizeOptions)
	const suffixExpected =
		'width:300,fit:contain,position:top,background:pink,withoutEnlargement:true'
	expect(suffix).toBe(suffixExpected)
})

test('build sharp pipeline', async () => {
	const pipeline = await buildPipeline(resizeOptions, 'png')
	expect(pipeline.writable).toBe(true)
})
