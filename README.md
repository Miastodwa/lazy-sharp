## How it works?

This function accepts only `GET` requests with `query params`.

-   It will return an image after applying requested transformations, such as resizing, cropping, etc.
-   If the image with those specific transformations did not exists, it will save it to the bucket.
-   All subsequent requests with the same params will be redirected to that image.

Example call:

>  https://<FUNCTION_URL>/lazysharp?**bucket**=my-bucket&**ref**=images/cover-1.jpg&**width**=300&**height**=300&**fit**=cover&**position**=top&**format**=webp`

## Query params

Query parameters are used to create arguments for `sharp` 

**`bucket`** – name of the bucket

**`ref`** – path to file (e.g. `images/my-image.jpg`)

`preset` – name of the preset transformation (e.g. `thumbnail`) see: Presets. When set, other transformation params will be ignored.

**`width`** – resize to width in px (e.g. `300`)

**`height`** – resize to height in px (e.g. `300`)

**`fit`** – **when both a width and height are provided**, the possible methods by which the image should fit these are:

-   `cover`: Crop to cover both provided dimensions (the default).
-   `contain`: Embed within both provided dimensions.
-   `fill`: Ignore the aspect ratio of the input and stretch to both provided dimensions.
-   `inside`: Preserving aspect ratio, resize the image to be as large as possible while ensuring its dimensions are less than or equal to both those specified.
-   `outside`: Preserving aspect ratio, resize the image to be as small as possible while ensuring its dimensions are greater than or equal to both those specified.

**`position`** – when using a fit of cover or contain, the default position is centre. Other options are:
`top`, `right top`, `right`, `right bottom`, `bottom`, `left bottom`, `left`, `left top`.

**`background`** – background colour when using a fit of contain, parsed by the [color](https://www.npmjs.org/package/color) module, defaults to black without transparency.

**`withoutEnlargement`** – do not enlarge if the width or height are already less than the specified dimensions

**`format`** – image output format: `jpeg`, `png`, `webp`

**`result`** – return a signed url string, or redirect to the image. Possible values: `url`, `redirect` (default).

**`cacheControl`** – image cacheControl. defaults to `public, max-age=31536000`

## Presets

It is a good idea to create some transformation presets, and then perhaps, also disable arbitrary query params, so that the function will be permitted to only generate files in preset formats. This will prevent the abuse of this function to create needless image files and litter your bucket.

To create your presets edit `functions/src/presets` file (`json` or `ts`).

To allow only preset transformations, you need to set firebase env variables:

- for deployment: `functions:config:set settings.presets_only=true`

- for local emulator: edit `functions/.runtimeconfig.json` by adding:

  ```json
  {
  	"settings": {
  		"presets_only": true
  	}
  }
  ```

## CORS

To setup CORS limits , you need to edit firebase env variables:

- for deployment: `functions:config:set settings.cors="your cors limits"`

- for local emulator: edit `functions/.runtimeconfig.json` by adding:

  ```json
  {
  	"settings": {
  		"cors": "your cors limits"
  	}
  }
  ```

## Authenticate function

In order to work, this function must be authenticated both locally and when deployed.

### Remote invocation

⚠️It is important that the service account running this function has right permissions.
The account running your firebase functions will usually be **App Engine default service account**. You must make sure that this account has a `iam.serviceAccounts.signBlob` permission on.

To add this permission You can enable a role: `Cloud Functions Service Agent` in your IAM settings, on the App Engine default service account.

### Local invocation

During development, when the function is called locally through the emulator, you still need to authenticate it. To do so, you need to obtain a json file with credentials associated with service account that have the permissions to execute the function. Here are instructions on how to download credentials in a json file: [Getting Started with Authentication](https://cloud.google.com/docs/authentication/getting-started)

Whe you have the file,  you need to provide authentication credentials by setting the environment variable GOOGLE_APPLICATION_CREDENTIALS to the absolute path of your file.

- rename file `functions/.credentials.example.sh` to `functions/.credentials.sh` 
- Edit the file: Replace path with the file path of the JSON file that contains your actual service account key.

[more information](https://cloud.google.com/docs/authentication/getting-started)