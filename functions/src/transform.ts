import * as functions from 'firebase-functions'
import * as admin from 'firebase-admin'
import * as Cors from 'cors'
import {fileUrl} from './utils'
const cors = Cors({ origin: true })
admin.initializeApp()

export const transform = functions.https.onRequest((req, res) => {

	if (req.method !== 'GET') return res.status(403).send('Forbidden')

	return cors(req, res, async () => {

		const params = {
			bucket: req.query.bucket,
			name: req.query.name,
			width: req.query.width,
			height: req.query.height,
			mode: req.query.mode,
		}

		let nameExt = ''
		if (params.width) nameExt += `-w:${params.width}`
		if (params.mode) nameExt += `-mode:${params.mode}`

		const storage = admin.storage()
		const bucket = storage.bucket(params.bucket)
		const original = bucket.file(params.name)
		const modified = bucket.file(params.name + nameExt)

		// if no nameExt, redirect to original.
		if (!nameExt) {
			const [meta] = await original.getMetadata()
			res.redirect(301, fileUrl(meta))
		}

		// Check if original and modified files exist
		const exist = await Promise.all([original.exists(), modified.exists()])
			.then(v => [v[0][0], v[1][0]])

		// if modified exists, redirect to it.
		if (exist[0] && exist[1]){
			const [meta] = await modified.getMetadata()
			res.redirect(301, fileUrl(meta))
		}

		res.set('Cache-Control', 'public, max-age=600, s-maxage=600')
		res.send(exist)
	})
})