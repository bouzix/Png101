import { defaultOptions as avifDefaultOptions } from '@jsquash/avif/meta.js';

let encoderPromise = null;
let decoderPromise = null;

async function instantiateCodecModule(createModule, wasmUrl, label) {
    const response = await fetch(wasmUrl);
    if (!response.ok) {
        throw new Error(`Failed to load ${label} WebAssembly codec (${response.status}).`);
    }
    const buffer = await response.arrayBuffer();
    const wasmModule = await WebAssembly.compile(buffer);

    return createModule({
        noInitialRun: true,
        instantiateWasm(imports, callback) {
            const instance = new WebAssembly.Instance(wasmModule, imports);
            callback(instance);
            return instance.exports;
        },
    });
}

async function getAvifEncoder() {
    if (!encoderPromise) {
        encoderPromise = (async () => {
            const [{ default: createEncoder }, { default: wasmUrl }] = await Promise.all([
                import('@jsquash/avif/codec/enc/avif_enc.js'),
                import('@jsquash/avif/codec/enc/avif_enc.wasm?url'),
            ]);
            return instantiateCodecModule(createEncoder, wasmUrl, 'AVIF encoder');
        })().catch((err) => {
            encoderPromise = null;
            throw err;
        });
    }
    return encoderPromise;
}

async function getAvifDecoder() {
    if (!decoderPromise) {
        decoderPromise = (async () => {
            const [{ default: createDecoder }, { default: wasmUrl }] = await Promise.all([
                import('@jsquash/avif/codec/dec/avif_dec.js'),
                import('@jsquash/avif/codec/dec/avif_dec.wasm?url'),
            ]);
            return instantiateCodecModule(createDecoder, wasmUrl, 'AVIF decoder');
        })().catch((err) => {
            decoderPromise = null;
            throw err;
        });
    }
    return decoderPromise;
}

export async function encodeCanvasToAvifBlob(canvas, quality = 0.78) {
    if (typeof WebAssembly !== 'object') {
        throw new Error('Your browser does not support WebAssembly required for client-side AVIF encoding.');
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) {
        throw new Error('Could not read canvas pixels for AVIF encoding.');
    }

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const normalizedQuality = quality <= 1 ? Math.round(quality * 100) : Math.round(quality);
    const clampedQuality = Math.max(1, Math.min(100, normalizedQuality || 75));

    const encoder = await getAvifEncoder();
    const encoded = encoder.encode(
        new Uint8Array(imageData.data.buffer),
        imageData.width,
        imageData.height,
        {
            ...avifDefaultOptions,
            quality: clampedQuality,
            qualityAlpha: -1,
            speed: 7,
            subsample: 1,
        }
    );

    if (!encoded || !encoded.length) {
        throw new Error('Browser AVIF encoding returned empty data.');
    }

    return new Blob([encoded], { type: 'image/avif' });
}

export async function decodeAvifToCanvas(source) {
    if (typeof WebAssembly !== 'object') {
        throw new Error('Your browser cannot decode AVIF images (WebAssembly unavailable).');
    }

    let buffer;
    if (typeof source === 'string') {
        const res = await fetch(source);
        if (!res.ok) {
            throw new Error(`Failed to fetch AVIF image (${res.status}).`);
        }
        buffer = await res.arrayBuffer();
    } else {
        buffer = await source.arrayBuffer();
    }

    const decoder = await getAvifDecoder();
    const decoded = decoder.decode(buffer, 8);
    if (!decoded || !decoded.width || !decoded.height) {
        throw new Error('Failed to decode AVIF image data.');
    }

    const canvas = document.createElement('canvas');
    canvas.width = decoded.width;
    canvas.height = decoded.height;
    const ctx = canvas.getContext('2d');
    ctx.putImageData(
        new ImageData(new Uint8ClampedArray(decoded.data), decoded.width, decoded.height),
        0,
        0
    );

    return {
        img: canvas,
        width: decoded.width,
        height: decoded.height,
        revoke: () => { },
    };
}
