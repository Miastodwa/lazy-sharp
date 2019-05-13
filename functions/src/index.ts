import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as Cors from 'cors'
import {
	buildSufix,
	splitFileName,
	parseFolder,
	buidlPipeline,
} from './utils'
import { CreateWriteStreamOptions, GetSignedUrlConfig } from '@google-cloud/storage'
import * as sharp from 'sharp'

const cors = Cors({ origin: true })
const CONFIG: GetSignedUrlConfig = {
	action: 'read',
	expires: '01-01-2100'
}

const { service } = functions.config()
const creds = service ? { credential: admin.credential.cert(service) } : {}

admin.initializeApp({
	...creds
})

export const lazysharp = functions.https.onRequest((req, res) => {

	if (req.method !== 'GET') return res.status(405).send('Method Not Allowed')

	return cors(req, res, async () => {

		const {query} = req

		const [name, ext] = splitFileName(query.name)

		const resizeOptions: sharp.ResizeOptions = {
			width: +query.width || null,
			height: +query.height || null,
			fit: query.fit,
			position: query.position,
			background: query.background,
			withoutEnlargement: query.withoutEnlargement
		}
		const params = {
			bucket: query.bucket,
			folder: parseFolder(query.folder),
			name: query.name,
			result: query.result || 'redirect',
			format: query.format || ext,
			resizeOptions: resizeOptions
		}
		const sufix = buildSufix(resizeOptions)
		const sufixedName = `${name}__${sufix}.${params.format}`

		const storage = admin.storage()
		const bucket = storage.bucket(params.bucket)
		const original = bucket.file(params.folder + params.name)
		const modified = bucket.file(params.folder + sufixedName)

		// if no requested transforms, redirect to original.
		if (!sufix && ext === params.format) {
			const url = await original
				.getSignedUrl(CONFIG)
				.catch(e => res.status(500).send(e.message))
			
			console.log('original')
			if (params.result === 'url') res.send(url[0])
			else res.redirect(301, url[0])
			return
		}

		// if modified exists, redirect to it.
		console.log('checking modified...')
		const [[modifiedExists], [modifiedUrl]] = await Promise.all([
			modified.exists(),
			modified.getSignedUrl(CONFIG)
		])
		if (modifiedExists) {
			console.log('...modified exists')
			if (params.result === 'url') res.send(modifiedUrl)
			else res.redirect(301, modifiedUrl)
			return
		}

		// if original exists, and modified doesn't, create it, and redirect to it
		console.log('creating file...')
		const formats = ['jpeg', 'png', 'webp']
		const {format} = params
		const modifiedMeta: CreateWriteStreamOptions = {
			public: true,
			metadata: {
				contentType: formats.includes(format)
					? `image/${format}`
					: 'image/jpeg',
				cacheControl: 'public, max-age=31536000'
			}
		}

		const pipeline = await buidlPipeline(resizeOptions, params.format)
			.catch( e => res.status(422).send(e.message))
		if (!pipeline) return

		const fileUploadStream = modified.createWriteStream(modifiedMeta)
		original.createReadStream().pipe(pipeline).pipe(fileUploadStream)

		const promiseUpload = new Promise((resolve, reject) =>
			fileUploadStream
				.on('finish', resolve)
				.on('error', reject)
		)
		await promiseUpload

		console.log('...file created')
		if (params.result === 'url') res.send( modifiedUrl )
		else res.redirect(301, modifiedUrl)
		return
	})
})