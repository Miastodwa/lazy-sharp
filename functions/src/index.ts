import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as Cors from 'cors'
import { buildPrefix, replaceExt, parseFolder, buidlPipeline } from './utils'
import { CreateWriteStreamOptions, GetSignedUrlConfig } from '@google-cloud/storage'
import * as sharp from 'sharp'

const cors = Cors({ origin: true })
const firebaseConfig = JSON.parse(process.env.FIREBASE_CONFIG)
const CONFIG: GetSignedUrlConfig = {
	action: 'read',
	expires: '01-01-2100'
}

admin.initializeApp({
	credential: admin.credential.cert(
		'/Users/franz/Sites/SERVERLESS/lazy-sharp/service_account.json'
	),
	databaseURL: firebaseConfig.databaseURL,
	storageBucket: firebaseConfig.storageBucket,
	projectId: firebaseConfig.projectId
})

export const lazysharp = functions.https.onRequest((req, res) => {

	if (req.method !== 'GET') return res.status(405).send('Method Not Allowed')

	return cors(req, res, async () => {

		const {query} = req

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
			resizeOptions: resizeOptions,
			format: query.format
		}
		const prefix = buildPrefix(resizeOptions)
		const modifiedName = replaceExt(params.name, params.format)

		const storage = admin.storage()
		const bucket = storage.bucket(params.bucket)
		const original = bucket.file(params.folder + params.name)
		const modified = bucket.file(params.folder + prefix + '__' + modifiedName)

		// if no prefix, redirect to original.
		if (!prefix && modifiedName === params.name) {
			const url = await original
				.getSignedUrl(CONFIG)
				.catch(e => res.status(500).send(e.message))

			if (params.result === 'redirect') res.redirect(301, url[0])
			if (params.result === 'stream') res.redirect(301, url[0])
			if (params.result === 'url') res.send({ url: url[0] })
			return
		}


		// if modified exists, redirect to it.
		const [[modifiedExists], [modifiedUrl]] = await Promise.all([
			modified.exists(),
			modified.getSignedUrl(CONFIG)
		])
		console.log(modifiedExists)
		if (modifiedExists) {
			console.log('modified exists')
			if (params.result === 'redirect') res.redirect(301, modifiedUrl)
			if (params.result === 'stream') res.redirect(301, modifiedUrl)
			if (params.result === 'url') res.send({ url: modifiedUrl })
			return
		}

		// if original exists, and modified doesn't, create it, and redirect to it
		console.log('creating file...')
		const [originalMeta] = await original.getMetadata()

		const modifiedMeta: CreateWriteStreamOptions = {
			public: true,
			metadata: {
				contentType: `image/${params.format}`,
				cacheControl: originalMeta.cacheControl,
			}
		}
		console.log(originalMeta.cacheControl)

		const pipeline = await buidlPipeline(resizeOptions, params.format)
			.catch( e => res.status(422).send(e.message))
		if (!pipeline) return

		if (params.result === 'stream') {
			try {
				original.createReadStream().pipe(pipeline).pipe(res)
				return
			}
			catch (error) {
				res.status(500).send(error)
			}
		}

		const fileUploadStream = modified.createWriteStream(modifiedMeta)
		original.createReadStream().pipe(pipeline).pipe(fileUploadStream)

		const promiseUpload = new Promise((resolve, reject) =>
			fileUploadStream
				.on('finish', resolve)
				.on('error', reject)
		)
		await promiseUpload
		console.log('...file created', modifiedUrl)

		if (params.result === 'redirect') res.redirect(301, modifiedUrl)
		if (params.result === 'url') res.send({ url: modifiedUrl })
		return
	})
})