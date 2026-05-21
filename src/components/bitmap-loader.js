// bitmap-loader.js
let fuckingDivWidthCache = 0;
let fuckingDivHeightCache = 0;

export function updateLoaderSizeCache(w, h) {
    fuckingDivWidthCache = w;
    fuckingDivHeightCache = h;
}

export class BitmapLoader {
    constructor() {
        this.decodeWorker = null;
        this.currentRequestId = 0;
        this.abortController = null;
        this.callbacks = new Map();
        this.initWorker();
    }

    initWorker() {
        const workerCode = `
      self.onmessage = async function(e) {
        const { blob, requestId } = e.data;
        try {
          const bitmap = await self.createImageBitmap(blob, {
            colorSpaceConversion: 'default',
            premultiplyAlpha: 'none'
          });
          self.postMessage({ bitmap, requestId }, [bitmap]);
        } catch (err) {
          self.postMessage({ error: err.message, requestId });
        }
      };
    `;
        const workerBlob = new Blob([workerCode], { type: 'application/javascript' });
        const workerUrl = URL.createObjectURL(workerBlob);
        this.decodeWorker = new Worker(workerUrl);
        URL.revokeObjectURL(workerUrl);

        this.decodeWorker.onmessage = (e) => {
            const { bitmap, error, requestId } = e.data;
            const cb = this.callbacks.get(requestId);
            if (cb) {
                this.callbacks.delete(requestId);
                if (error) cb.onError(error); else cb.onReady(bitmap);
            } else if (bitmap) {
                bitmap.close();
            }
        };
    }

    async getFinalImageUrl(props, activeImageListIndex) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
        const width = Math.round((fuckingDivWidthCache || window.innerWidth) * dpr);
        const height = Math.round((fuckingDivHeightCache || window.innerHeight) * dpr);
        const tag = props.unSplashTag;
        const useUnSplashService = props.useUnSplash === true || (!props.imageList || props.imageList.length < 1);

        if (useUnSplashService && props.unSplashAccessKey) {
            let orientation = (height > width) ? 'portrait' : (height === width ? 'squarish' : 'landscape');
            const queryParam = tag ? `&query=${tag}` : '';
            try {
                const res = await fetch(`https://api.unsplash.com/photos/random?client_id=${props.unSplashAccessKey}${queryParam}&orientation=${orientation}`);
                if (!res.ok) throw new Error(`Unsplash Error: ${res.status}`);
                const data = await res.json();
                return `${data.urls.raw}&w=${width}&h=${height}&fit=crop&q=85&auto=format`;
            } catch (e) {
                console.warn('⚠️ Unsplash API failed, falling back to LoremFlickr.');
            }
        }

        if (!useUnSplashService && props.imageList?.length > 0) {
            return props.imageList[activeImageListIndex];
        }
        const tagPath = tag ? `/${tag}` : '';
        return `https://loremflickr.com/${width}/${height}${tagPath}?random=${Date.now()}`;
    }

    async load(props, activeImageListIndex, onReady, onError) {
        if (this.abortController) this.abortController.abort();
        this.abortController = new AbortController();
        this.currentRequestId++;
        const activeId = this.currentRequestId;
        try {
            const url = await this.getFinalImageUrl(props, activeImageListIndex);
            const res = await fetch(url, { signal: this.abortController.signal });
            const blob = await res.blob();
            this.callbacks.set(activeId, { onReady, onError });
            this.decodeWorker.postMessage({ blob, requestId: activeId });
        } catch (err) {
            if (err.name !== 'AbortError') onError(err.message);
        }
    }

    destroy() {
        if (this.abortController) this.abortController.abort();
        if (this.decodeWorker) this.decodeWorker.terminate();
        this.callbacks.clear();
    }
}