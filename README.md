# lazysharp

firebase function for on the fly image transformation using [sharp library](https://www.npmjs.com/package/sharp).

### How it works?

This function accepts only `GET` requests with `query params`.

-   It will return an image after applying requested transformations, such as resizing, cropping, etc.
-   If the image with those specific transformations did not exists, it will save it to the bucket.
-   All subsequent requests with the same params will be redirected to that image.

Example call:

https://<FUNCTION_URL>/lazysharp?**bucket**=my-bucket&**ref**=images/cover-1.jpg&**width**=300&**height**=300&**fit**=cover&**position**=top&**format**=webp

### Query params

**`bucket`** — name of the bucket

**`ref`** – path to file (e.g: `images/my-image.jpg`)

**`width`** – resize to width

**`height`** – resize to height

**`fit`**
When both a width and height are provided, the possible methods by which the image should fit these are:

-   `cover`: Crop to cover both provided dimensions (the default).
-   `contain`: Embed within both provided dimensions.
-   `fill`: Ignore the aspect ratio of the input and stretch to both provided dimensions.
-   `inside`: Preserving aspect ratio, resize the image to be as large as possible while ensuring its dimensions are less than or equal to both those specified.
-   `outside`: Preserving aspect ratio, resize the image to be as small as possible while ensuring its dimensions are greater than or equal to both those specified.

**`position`** – When using a fit of cover or contain, the default position is centre. Other options are:
`top`, `right top`, `right`, `right bottom`, `bottom`, `left bottom`, `left`, `left top`.

**`background`**
– background colour when using a fit of contain, parsed by the [color](https://www.npmjs.org/package/color) module, defaults to black without transparency.

**`withoutEnlargement`**
– do not enlarge if the width or height are already less than the specified dimensions

**`result`**
– return a signed url string, or redirect to the image. Possible values: `url`, `redirect` (default).

**`format`**
– image output format: `jpeg`, `png`, `webp`

**`cacheControl`**
– image cacheControl. defaults to `public, max-age=31536000`

### Authenticate function

In order to work, this function must be authenticated both locally and when deployed.

#### Remote invocation

It is important that the default **Service account** has right permissions.
Permission iam.serviceAccounts.signBlob is required on your _App Engine default service account_ to execute this function.
You can add a role: `Cloud Functions Service Agent` in your IAM settings.

#### Local invocation

When the function is called locally through the emulator, you need to use **one** of the below methods:

**A. Set a global variable**
[more information](https://cloud.google.com/docs/authentication/getting-started#auth-cloud-implicit-nodejs)

**B. Manually pass credentials to `admin.initializeApp()`**

Save your credentials from keyfile.json to `.runtimeconfig.json`. In the `src/index.ts` replace:

```typescript
admin.initializeApp();
```

with:

```typescript
import * as functions from "firebase-functions";
const { service } = functions.config();
// service is an object equal to keyfile.json. Just save it in runtimeconfig.json
const creds = service ? { credential: admin.credential.cert(service) } : {};
admin.initializeApp(creds);
```
