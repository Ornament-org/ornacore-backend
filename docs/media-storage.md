# Media Storage

OrnaCore keeps media upload callers independent from the storage vendor.

## Active provider

Set the provider in `.env`:

```env
MEDIA_STORAGE_PROVIDER=cloudinary
```

Supported providers:

- `local`
- `cloudinary`

The application calls `mediaStorageService` only. It does not call Cloudinary or the local
filesystem directly.

## Provider contract

Every provider implements:

```js
{
  (name, isConfigured(), uploadBuffer(buffer, options), destroy(publicId, options));
}
```

`uploadBuffer` returns the normalized fields used by the media module:

```js
{
  (provider, publicId, secureUrl, resourceType, folder, width, height, metadata);
}
```

## Cloudinary

```env
MEDIA_STORAGE_PROVIDER=cloudinary
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_ROOT_FOLDER=ornacore/dev
```

All Cloudinary assets are uploaded below `CLOUDINARY_ROOT_FOLDER`.

## Adding Amazon S3 later

1. Create an adapter such as `src/integrations/media/providers/s3-media.provider.js`.
2. Implement the provider contract above.
3. Register it in `src/integrations/media/media-storage.service.js`.
4. Add `s3` to `MEDIA_STORAGE_PROVIDER` validation and configure its environment variables.

No controller, product, category, or frontend upload code needs to change.
