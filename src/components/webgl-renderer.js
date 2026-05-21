// webgl-renderer.js
import { STRIDE_BYTES } from './animation-engine.js';

const DYNAMIC_SPLIT_STRIDE_BYTES = 24;

const VS_SOURCE_ANIMATED = `#version 300 es
layout(location = 0) in vec2 a_quadPos;       // [0,0 -> 1,1]
layout(location = 1) in vec4 a_srcBox;        // sx, sy, sw, sh
layout(location = 2) in vec4 a_targetBox;     // tx, ty, dw, dh
layout(location = 3) in vec2 a_startPos;      // startX, startY
layout(location = 4) in float a_startOpacity; // 0~1
layout(location = 5) in vec2 a_timing;        // delay, duration
layout(location = 6) in float a_easingRow;    // easing row index

uniform float u_time;
uniform vec2 u_invResolution;
uniform vec2 u_textureSize;
uniform sampler2D u_lut;
uniform float u_lutHeight;

out vec2 v_uv;
out float v_opacity;

void main() {
    float delay = a_timing.x;
    float dur = a_timing.y;
    float easeRow = a_easingRow;

    float progress = dur > 0.0 ? clamp((u_time - delay) / dur, 0.0, 1.0) : 1.0;
    float t = texture(u_lut, vec2(progress, (easeRow + 0.5) / u_lutHeight)).r;
    if (dur == 0.0 && u_time == 0.0) { t = 1.0; }

    vec2 currentPos = mix(a_startPos, a_targetBox.xy, t);
    v_opacity = mix(a_startOpacity, 1.0, t);

    vec2 pixelPos = currentPos + a_quadPos * a_targetBox.zw;
    vec2 clipSpace = (pixelPos * u_invResolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0); 

    vec2 srcPixelPos = a_srcBox.xy + a_quadPos * a_srcBox.zw;
    v_uv = srcPixelPos / u_textureSize;
}
`;

const VS_SOURCE_STATIC = `#version 300 es
layout(location = 0) in vec2 a_quadPos;       // [0,0 -> 1,1]
layout(location = 1) in vec4 a_srcBox;        // sx, sy, sw, sh
layout(location = 2) in vec4 a_targetBox;     // tx, ty, dw, dh

uniform vec2 u_invResolution;
uniform vec2 u_textureSize;

out vec2 v_uv;
out float v_opacity;

void main() {
    vec2 pixelPos = a_targetBox.xy + a_quadPos * a_targetBox.zw;
    vec2 clipSpace = (pixelPos * u_invResolution) * 2.0 - 1.0;
    gl_Position = vec4(clipSpace.x, -clipSpace.y, 0.0, 1.0);

    vec2 srcPixelPos = a_srcBox.xy + a_quadPos * a_srcBox.zw;
    v_uv = srcPixelPos / u_textureSize;
    v_opacity = 1.0;
}
`;

const FS_SOURCE_NORMAL = `#version 300 es
precision highp float;
in vec2 v_uv;
in float v_opacity;

uniform sampler2D u_image;
out vec4 outColor;

void main() {
    vec4 texColor = texture(u_image, v_uv);
    outColor = vec4(texColor.rgb, texColor.a * v_opacity);
}
`;

const FS_SOURCE_SINGLE_PASS = `#version 300 es
precision highp float;
in vec2 v_uv;
in float v_opacity;

uniform sampler2D u_oldImage;
uniform sampler2D u_newImage;
out vec4 outColor;

void main() {
    vec4 oldColor = texture(u_oldImage, v_uv);
    vec4 newColor = texture(u_newImage, v_uv);
    outColor = mix(oldColor, newColor, v_opacity);
}
`;

const VS_SOURCE_BLIT = `#version 300 es
layout(location = 0) in vec2 a_quadPos;
out vec2 v_uv;

void main() {
    v_uv = a_quadPos;
    vec2 clipSpace = a_quadPos * 2.0 - 1.0;
    gl_Position = vec4(clipSpace.x, clipSpace.y, 0.0, 1.0);
}
`;

const FS_SOURCE_BLIT = `#version 300 es
precision highp float;
in vec2 v_uv;

uniform sampler2D u_image;
out vec4 outColor;

void main() {
    outColor = texture(u_image, v_uv);
}
`;

export class WebGLRenderer {
    constructor(canvasElement) {
        this.canvas = canvasElement;
        this.gl = canvasElement.getContext('webgl2', { alpha: false, antialias: false, premultipliedAlpha: false });
        const gl = this.gl;

        if (!gl) throw new Error("WebGL2 not supported");

        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

        this.programStatic = this.createProgram(VS_SOURCE_STATIC, FS_SOURCE_NORMAL);
        this.programAnimated = this.createProgram(VS_SOURCE_ANIMATED, FS_SOURCE_NORMAL);
        this.programSinglePass = this.createProgram(VS_SOURCE_ANIMATED, FS_SOURCE_SINGLE_PASS);
        this.programBlit = this.createProgram(VS_SOURCE_BLIT, FS_SOURCE_BLIT);
        this.currentProgram = null;
        this.useProgramIfNeeded(this.programAnimated);

        this.uInvResLocStatic = gl.getUniformLocation(this.programStatic, "u_invResolution");
        this.uTexSizeLocStatic = gl.getUniformLocation(this.programStatic, "u_textureSize");

        this.uTimeLocAnimated = gl.getUniformLocation(this.programAnimated, "u_time");
        this.uInvResLocAnimated = gl.getUniformLocation(this.programAnimated, "u_invResolution");
        this.uTexSizeLocAnimated = gl.getUniformLocation(this.programAnimated, "u_textureSize");
        this.uLutLocAnimated = gl.getUniformLocation(this.programAnimated, "u_lut");
        this.uLutHeightLocAnimated = gl.getUniformLocation(this.programAnimated, "u_lutHeight");

        this.uTimeLocSingle = gl.getUniformLocation(this.programSinglePass, "u_time");
        this.uInvResLocSingle = gl.getUniformLocation(this.programSinglePass, "u_invResolution");
        this.uTexSizeLocSingle = gl.getUniformLocation(this.programSinglePass, "u_textureSize");
        this.uLutLocSingle = gl.getUniformLocation(this.programSinglePass, "u_lut");
        this.uLutHeightLocSingle = gl.getUniformLocation(this.programSinglePass, "u_lutHeight");

        this.useProgramIfNeeded(this.programStatic);
        gl.uniform1i(gl.getUniformLocation(this.programStatic, "u_image"), 0);

        this.useProgramIfNeeded(this.programAnimated);
        gl.uniform1i(gl.getUniformLocation(this.programAnimated, "u_image"), 0);
        gl.uniform1i(this.uLutLocAnimated, 1);

        this.useProgramIfNeeded(this.programSinglePass);
        gl.uniform1i(gl.getUniformLocation(this.programSinglePass, "u_oldImage"), 2);
        gl.uniform1i(gl.getUniformLocation(this.programSinglePass, "u_newImage"), 0);
        gl.uniform1i(this.uLutLocSingle, 1);

        this.useProgramIfNeeded(this.programBlit);
        gl.uniform1i(gl.getUniformLocation(this.programBlit, "u_image"), 0);

        this.useProgramIfNeeded(this.programAnimated);
        this.cachedUTime = NaN;
        this.cachedUResX = NaN;
        this.cachedUResY = NaN;
        this.cachedUTexSizeX = NaN;
        this.cachedUTexSizeY = NaN;
        this.cachedULutHeight = NaN;

        this.setupVAO();

        this.oldTexturePair = [this.createBaseTexture(), this.createBaseTexture()];
        this.newTexturePair = [this.createBaseTexture(), this.createBaseTexture()];
        this.oldTextureStorageReady = [false, false];
        this.newTextureStorageReady = [false, false];
        this.oldTextureBitmapRef = null;
        this.newTextureBitmapRef = null;
        this.oldTextureReadIndex = 0;
        this.newTextureReadIndex = 0;
        this.oldTexture = this.oldTexturePair[this.oldTextureReadIndex];
        this.newTexture = this.newTexturePair[this.newTextureReadIndex];
        this.lutTexture = gl.createTexture();
        this.dualInstanceMode = false;
        this.splitAnimatedMode = false;
        this.splitSharedStaticMode = false;
        this.enableSinglePassMix = false;
        this.oldLayerInstanceReady = false;
        this.oldPassBypassEligible = false;
        this.assumeOpaqueTextures = false;
        this.opaqueBaseCoversViewport = false;
        this.dirtyRect = null;
        this.dirtyRectEnabled = false;
        this.dirtyRectX = 0;
        this.dirtyRectY = 0;
        this.dirtyRectW = 0;
        this.dirtyRectH = 0;
        this.blendEnabled = true;
        this.oldTexStorageSize = null;
        this.newTexStorageSize = null;
        this.oldTexSampleSize = null;
        this.newTexSampleSize = null;
        this.instanceVBOCapacityBytes = 0;
        this.instanceVBOOldCapacityBytes = 0;
        this.instanceVBONewCapacityBytes = 0;
        this.oldStaticVBOCapacityBytes = 0;
        this.newStaticVBOCapacityBytes = 0;
        this.dynamicVBOCapacityBytes = 0;
        this.currentBoundVAO = null;
        this.currentActiveTextureUnit = -1;
        this.boundTexture2DByUnit = [null, null, null];
        this.scissorEnabled = false;
        this.scissorX = -1;
        this.scissorY = -1;
        this.scissorW = -1;
        this.scissorH = -1;
        this.logicalWidth = 0;
        this.logicalHeight = 0;
        this.activeInstanceCount = 0;
        this.animatedInstanceCount = 0;
        this.staticBaseCacheEnabled = true;
        this.staticBaseCacheDirty = true;
        this.staticBaseCacheValid = false;
        this.staticBaseCacheTexture = gl.createTexture();
        this.staticBaseCacheFramebuffer = gl.createFramebuffer();
        this.staticBaseCacheWidth = 0;
        this.staticBaseCacheHeight = 0;
        this.clearColorR = 0;
        this.clearColorG = 0;
        this.clearColorB = 0;

        this.perfStats = {
            frames: 0,
            bufferUploads: 0,
            bufferUploadBytes: 0,
            bufferReallocs: 0,
            textureUploads: 0,
            textureUploadPixels: 0,
            textureReallocs: 0,
            textureSwapUploads: 0,
            sharedStaticHits: 0,
            singlePassHits: 0,
            clearSkipped: 0,
            activeInstancesAccum: 0,
            activeInstancesAvg: 0,
            animatedInstancesPeak: 0,
            animatedInstancesAccum: 0,
            animatedInstancesAvg: 0,
            compactionCoverage: 1
        };
    }

    resetPerfStats() {
        this.perfStats.frames = 0;
        this.perfStats.bufferUploads = 0;
        this.perfStats.bufferUploadBytes = 0;
        this.perfStats.bufferReallocs = 0;
        this.perfStats.textureUploads = 0;
        this.perfStats.textureUploadPixels = 0;
        this.perfStats.textureReallocs = 0;
        this.perfStats.textureSwapUploads = 0;
        this.perfStats.sharedStaticHits = 0;
        this.perfStats.singlePassHits = 0;
        this.perfStats.clearSkipped = 0;
        this.perfStats.activeInstancesAccum = 0;
        this.perfStats.activeInstancesAvg = 0;
        this.perfStats.animatedInstancesPeak = 0;
        this.perfStats.animatedInstancesAccum = 0;
        this.perfStats.animatedInstancesAvg = 0;
        this.perfStats.compactionCoverage = 1;
    }

    getPerfStats(reset = false) {
        if (this.perfStats.frames > 0) {
            this.perfStats.activeInstancesAvg = this.perfStats.activeInstancesAccum / this.perfStats.frames;
            this.perfStats.animatedInstancesAvg = this.perfStats.animatedInstancesAccum / this.perfStats.frames;
            this.perfStats.compactionCoverage =
                this.perfStats.activeInstancesAvg > 0
                    ? this.perfStats.animatedInstancesAvg / this.perfStats.activeInstancesAvg
                    : 1;
        } else {
            this.perfStats.activeInstancesAvg = 0;
            this.perfStats.animatedInstancesAvg = 0;
            this.perfStats.compactionCoverage = 1;
        }
        const snapshot = { ...this.perfStats };
        if (reset) this.resetPerfStats();
        return snapshot;
    }

    createBaseTexture() {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        return tex;
    }

    createProgram(vsSrc, fsSrc) {
        const gl = this.gl;
        const vs = gl.createShader(gl.VERTEX_SHADER);
        gl.shaderSource(vs, vsSrc);
        gl.compileShader(vs);
        const fs = gl.createShader(gl.FRAGMENT_SHADER);
        gl.shaderSource(fs, fsSrc);
        gl.compileShader(fs);
        const p = gl.createProgram();
        gl.attachShader(p, vs);
        gl.attachShader(p, fs);
        gl.linkProgram(p);
        return p;
    }

    useProgramIfNeeded(program) {
        const gl = this.gl;
        if (this.currentProgram !== program) {
            gl.useProgram(program);
            this.currentProgram = program;
            this.cachedUTime = NaN;
            this.cachedUResX = NaN;
            this.cachedUResY = NaN;
            this.cachedUTexSizeX = NaN;
            this.cachedUTexSizeY = NaN;
            this.cachedULutHeight = NaN;
        }
    }

    setUniform1fCached(cacheKey, location, value) {
        const gl = this.gl;
        if (this[cacheKey] !== value) {
            gl.uniform1f(location, value);
            this[cacheKey] = value;
        }
    }

    setUniform2fCached(cacheKeyX, cacheKeyY, location, x, y) {
        const gl = this.gl;
        if (this[cacheKeyX] !== x || this[cacheKeyY] !== y) {
            gl.uniform2f(location, x, y);
            this[cacheKeyX] = x;
            this[cacheKeyY] = y;
        }
    }

    setActiveTextureUnit(unit) {
        const gl = this.gl;
        if (this.currentActiveTextureUnit !== unit) {
            gl.activeTexture(gl.TEXTURE0 + unit);
            this.currentActiveTextureUnit = unit;
        }
    }

    bindTexture2D(unit, texture) {
        const gl = this.gl;
        this.setActiveTextureUnit(unit);
        if (this.boundTexture2DByUnit[unit] !== texture) {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            this.boundTexture2DByUnit[unit] = texture;
        }
    }

    setBlendEnabled(enabled) {
        const gl = this.gl;
        if (this.blendEnabled === enabled) return;
        if (enabled) gl.enable(gl.BLEND);
        else gl.disable(gl.BLEND);
        this.blendEnabled = enabled;
    }

    bindVaoIfNeeded(vao) {
        const gl = this.gl;
        if (this.currentBoundVAO !== vao) {
            gl.bindVertexArray(vao);
            this.currentBoundVAO = vao;
        }
    }

    setScissorRect(rect) {
        const gl = this.gl;
        if (!rect || rect.w <= 0 || rect.h <= 0) {
            if (this.scissorEnabled) {
                gl.disable(gl.SCISSOR_TEST);
                this.scissorEnabled = false;
            }
            return;
        }

        if (!this.scissorEnabled) {
            gl.enable(gl.SCISSOR_TEST);
            this.scissorEnabled = true;
        }
        if (
            this.scissorX !== rect.x ||
            this.scissorY !== rect.y ||
            this.scissorW !== rect.w ||
            this.scissorH !== rect.h
        ) {
            gl.scissor(rect.x, rect.y, rect.w, rect.h);
            this.scissorX = rect.x;
            this.scissorY = rect.y;
            this.scissorW = rect.w;
            this.scissorH = rect.h;
        }
    }

    setScissorRectValues(x, y, w, h) {
        const gl = this.gl;
        if (w <= 0 || h <= 0) {
            if (this.scissorEnabled) {
                gl.disable(gl.SCISSOR_TEST);
                this.scissorEnabled = false;
            }
            return;
        }

        if (!this.scissorEnabled) {
            gl.enable(gl.SCISSOR_TEST);
            this.scissorEnabled = true;
        }
        if (
            this.scissorX !== x ||
            this.scissorY !== y ||
            this.scissorW !== w ||
            this.scissorH !== h
        ) {
            gl.scissor(x, y, w, h);
            this.scissorX = x;
            this.scissorY = y;
            this.scissorW = w;
            this.scissorH = h;
        }
    }

    setupVAO() {
        const gl = this.gl;
        this.quadVBO = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW);
        this.locQuadPos = 0;

        this.instanceVBO = gl.createBuffer();
        this.instanceVBOOld = gl.createBuffer();
        this.instanceVBONew = gl.createBuffer();
        this.staticVBOOld = gl.createBuffer();
        this.staticVBONew = gl.createBuffer();
        this.dynamicVBONew = gl.createBuffer();

        this.locSrc = 1;
        this.locTarget = 2;
        this.locStartPos = 3;
        this.locStartOpacity = 4;
        this.locTiming = 5;
        this.locEasingRow = 6;

        this.vaoInterleavedBase = this.createInterleavedVAO(this.instanceVBO);
        this.vaoInterleavedOld = this.createInterleavedVAO(this.instanceVBOOld);
        this.vaoInterleavedNew = this.createInterleavedVAO(this.instanceVBONew);
        this.vaoSplitOld = this.createSplitOldVAO(this.staticVBOOld);
        this.vaoSplitNew = this.createSplitNewVAO(this.staticVBONew, this.dynamicVBONew);
        this.vaoScreenQuad = this.createScreenQuadVAO();
    }

    bindQuadAttribute() {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, this.quadVBO);
        gl.enableVertexAttribArray(this.locQuadPos);
        gl.vertexAttribPointer(this.locQuadPos, 2, gl.FLOAT, false, 0, 0);
    }

    setupInterleavedInstanceAttributes(instanceBuffer) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);

        gl.enableVertexAttribArray(this.locSrc);
        gl.vertexAttribPointer(this.locSrc, 4, gl.FLOAT, false, STRIDE_BYTES, 0);
        gl.vertexAttribDivisor(this.locSrc, 1);

        gl.enableVertexAttribArray(this.locTarget);
        gl.vertexAttribPointer(this.locTarget, 4, gl.FLOAT, false, STRIDE_BYTES, 16);
        gl.vertexAttribDivisor(this.locTarget, 1);

        gl.enableVertexAttribArray(this.locStartPos);
        gl.vertexAttribPointer(this.locStartPos, 2, gl.FLOAT, false, STRIDE_BYTES, 32);
        gl.vertexAttribDivisor(this.locStartPos, 1);

        gl.enableVertexAttribArray(this.locStartOpacity);
        gl.vertexAttribPointer(this.locStartOpacity, 1, gl.FLOAT, false, STRIDE_BYTES, 40);
        gl.vertexAttribDivisor(this.locStartOpacity, 1);

        gl.enableVertexAttribArray(this.locTiming);
        gl.vertexAttribPointer(this.locTiming, 2, gl.FLOAT, false, STRIDE_BYTES, 44);
        gl.vertexAttribDivisor(this.locTiming, 1);

        gl.enableVertexAttribArray(this.locEasingRow);
        gl.vertexAttribPointer(this.locEasingRow, 1, gl.FLOAT, false, STRIDE_BYTES, 52);
        gl.vertexAttribDivisor(this.locEasingRow, 1);
    }

    setupStaticAttributes(staticBuffer) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, staticBuffer);

        gl.enableVertexAttribArray(this.locSrc);
        gl.vertexAttribPointer(this.locSrc, 4, gl.FLOAT, false, 32, 0);
        gl.vertexAttribDivisor(this.locSrc, 1);

        gl.enableVertexAttribArray(this.locTarget);
        gl.vertexAttribPointer(this.locTarget, 4, gl.FLOAT, false, 32, 16);
        gl.vertexAttribDivisor(this.locTarget, 1);
    }

    setupDynamicAttributes(dynamicBuffer) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, dynamicBuffer);

        gl.enableVertexAttribArray(this.locStartPos);
        gl.vertexAttribPointer(this.locStartPos, 2, gl.FLOAT, false, DYNAMIC_SPLIT_STRIDE_BYTES, 0);
        gl.vertexAttribDivisor(this.locStartPos, 1);

        gl.enableVertexAttribArray(this.locStartOpacity);
        gl.vertexAttribPointer(this.locStartOpacity, 1, gl.FLOAT, false, DYNAMIC_SPLIT_STRIDE_BYTES, 8);
        gl.vertexAttribDivisor(this.locStartOpacity, 1);

        gl.enableVertexAttribArray(this.locTiming);
        gl.vertexAttribPointer(this.locTiming, 2, gl.FLOAT, false, DYNAMIC_SPLIT_STRIDE_BYTES, 12);
        gl.vertexAttribDivisor(this.locTiming, 1);

        gl.enableVertexAttribArray(this.locEasingRow);
        gl.vertexAttribPointer(this.locEasingRow, 1, gl.FLOAT, false, DYNAMIC_SPLIT_STRIDE_BYTES, 20);
        gl.vertexAttribDivisor(this.locEasingRow, 1);
    }

    setupStaticDynamicConstants() {
        const gl = this.gl;
        gl.disableVertexAttribArray(this.locStartPos);
        gl.disableVertexAttribArray(this.locStartOpacity);
        gl.disableVertexAttribArray(this.locTiming);
        gl.disableVertexAttribArray(this.locEasingRow);
        gl.vertexAttrib2f(this.locStartPos, 0.0, 0.0);
        gl.vertexAttrib1f(this.locStartOpacity, 1.0);
        gl.vertexAttrib2f(this.locTiming, 0.0, 0.0);
        gl.vertexAttrib1f(this.locEasingRow, 0.0);
    }

    createInterleavedVAO(instanceBuffer) {
        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        this.bindQuadAttribute();
        this.setupInterleavedInstanceAttributes(instanceBuffer);
        gl.bindVertexArray(null);
        return vao;
    }

    createSplitOldVAO(staticBuffer) {
        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        this.bindQuadAttribute();
        this.setupStaticAttributes(staticBuffer);
        this.setupStaticDynamicConstants();
        gl.bindVertexArray(null);
        return vao;
    }

    createSplitNewVAO(staticBuffer, dynamicBuffer) {
        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        this.bindQuadAttribute();
        this.setupStaticAttributes(staticBuffer);
        this.setupDynamicAttributes(dynamicBuffer);
        gl.bindVertexArray(null);
        return vao;
    }

    createScreenQuadVAO() {
        const gl = this.gl;
        const vao = gl.createVertexArray();
        gl.bindVertexArray(vao);
        this.bindQuadAttribute();
        gl.bindVertexArray(null);
        return vao;
    }

    uploadLUT(lutData, width, height) {
        const gl = this.gl;
        this.bindTexture2D(1, this.lutTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.R32F, width, height, 0, gl.RED, gl.FLOAT, lutData);

        this.useProgramIfNeeded(this.programAnimated);
        this.setUniform1fCached('cachedULutHeight', this.uLutHeightLocAnimated, height);
        this.useProgramIfNeeded(this.programSinglePass);
        this.setUniform1fCached('cachedULutHeight', this.uLutHeightLocSingle, height);
    }

    uploadBitmapToTexture(layer, bitmap) {
        const gl = this.gl;
        const isOld = layer === 'old';
        const storageKey = isOld ? 'oldTexStorageSize' : 'newTexStorageSize';
        const sampleKey = isOld ? 'oldTexSampleSize' : 'newTexSampleSize';
        const sizeKey = isOld ? 'oldTexSize' : 'newTexSize';
        const bitmapRefKey = isOld ? 'oldTextureBitmapRef' : 'newTextureBitmapRef';
        const pairKey = isOld ? 'oldTexturePair' : 'newTexturePair';
        const storageReadyKey = isOld ? 'oldTextureStorageReady' : 'newTextureStorageReady';
        const readIndexKey = isOld ? 'oldTextureReadIndex' : 'newTextureReadIndex';
        const currentTexKey = isOld ? 'oldTexture' : 'newTexture';

        const texturePair = this[pairKey];
        const storageReadyPair = this[storageReadyKey];
        const readIndex = this[readIndexKey];
        const writeIndex = 1 - readIndex;
        let texture = texturePair[writeIndex];
        const storageSize = this[storageKey];
        const width = bitmap.width;
        const height = bitmap.height;

        if (
            this[bitmapRefKey] === bitmap &&
            this[sizeKey] &&
            this[sizeKey][0] === width &&
            this[sizeKey][1] === height
        ) {
            this[sampleKey] = this[storageKey] || this[sizeKey];
            return;
        }

        const needsGrow = !storageSize || width > storageSize[0] || height > storageSize[1];
        if (needsGrow) {
            const storageWidth = storageSize ? Math.max(storageSize[0], width) : width;
            const storageHeight = storageSize ? Math.max(storageSize[1], height) : height;
            for (let i = 0; i < 2; i++) {
                if (texturePair[i]) gl.deleteTexture(texturePair[i]);
                texturePair[i] = this.createBaseTexture();
                this.bindTexture2D(0, texturePair[i]);
                gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, storageWidth, storageHeight);
                storageReadyPair[i] = true;
            }
            texture = texturePair[writeIndex];
            this[storageKey] = [storageWidth, storageHeight];
            this.perfStats.textureReallocs++;
        } else {
            this.bindTexture2D(0, texture);
            if (!storageReadyPair[writeIndex]) {
                gl.texStorage2D(gl.TEXTURE_2D, 1, gl.RGBA8, storageSize[0], storageSize[1]);
                storageReadyPair[writeIndex] = true;
            }
        }

        gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, bitmap);
        this.perfStats.textureUploads++;
        this.perfStats.textureUploadPixels += width * height;
        this[sizeKey] = [width, height];
        this[sampleKey] = this[storageKey];
        this[bitmapRefKey] = bitmap;
        this[readIndexKey] = writeIndex;
        this[currentTexKey] = texturePair[writeIndex];
        if (isOld) this.invalidateStaticBaseCache();
        this.perfStats.textureSwapUploads++;
    }

    // 修改：同时接管新旧贴图上传
    uploadTextures(oldBitmap, newBitmap) {
        this.setActiveTextureUnit(0);

        if (oldBitmap) {
            this.uploadBitmapToTexture('old', oldBitmap);
        } else {
            this.oldTexSize = null;
            this.oldTexSampleSize = null;
            this.oldTextureBitmapRef = null;
            this.invalidateStaticBaseCache();
        }

        if (newBitmap) {
            this.uploadBitmapToTexture('new', newBitmap);
        } else {
            this.newTexSize = null;
            this.newTexSampleSize = null;
            this.newTextureBitmapRef = null;
        }
    }

    resize(w, h, clearColor) {
        const dpr = Math.min(window.devicePixelRatio || 1, 2.0);
        const safeW = Math.max(1, Math.floor(w));
        const safeH = Math.max(1, Math.floor(h));
        this.canvas.style.width = `${safeW}px`;
        this.canvas.style.height = `${safeH}px`;

        const logicalW = safeW;
        const logicalH = safeH;
        const dw = Math.max(1, Math.round(logicalW * dpr));
        const dh = Math.max(1, Math.round(logicalH * dpr));

        this.canvas.width = dw;
        this.canvas.height = dh;

        const gl = this.gl;
        gl.viewport(0, 0, dw, dh);
        this.logicalWidth = logicalW;
        this.logicalHeight = logicalH;
        const invW = 1 / logicalW;
        const invH = 1 / logicalH;
        this.useProgramIfNeeded(this.programStatic);
        this.setUniform2fCached('cachedUResX', 'cachedUResY', this.uInvResLocStatic, invW, invH);
        this.useProgramIfNeeded(this.programAnimated);
        this.setUniform2fCached('cachedUResX', 'cachedUResY', this.uInvResLocAnimated, invW, invH);
        this.useProgramIfNeeded(this.programSinglePass);
        this.setUniform2fCached('cachedUResX', 'cachedUResY', this.uInvResLocSingle, invW, invH);
        this.invalidateStaticBaseCache();

        if (clearColor) {
            this.clearBackgroundColor(clearColor);
        }
    }

    ensureCanvasReady() {
        const gl = this.gl;
        if (this.canvas.width <= 0 || this.canvas.height <= 0) return;

        // 强制刷新所有 uniform 缓存（Safari 兼容性修复）
        this.cachedUTime = NaN;
        this.cachedUResX = NaN;
        this.cachedUResY = NaN;
        this.cachedUTexSizeX = NaN;
        this.cachedUTexSizeY = NaN;
        this.cachedULutHeight = NaN;
        this.currentBoundVAO = null;
        this.currentActiveTextureUnit = -1;
        this.currentProgram = null;

        // 重新设置 viewport 和 u_invResolution
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);
        const invW = this.logicalWidth > 0 ? 1 / this.logicalWidth : 0;
        const invH = this.logicalHeight > 0 ? 1 / this.logicalHeight : 0;

        this.useProgramIfNeeded(this.programStatic);
        gl.uniform2f(this.uInvResLocStatic, invW, invH);

        this.useProgramIfNeeded(this.programAnimated);
        gl.uniform2f(this.uInvResLocAnimated, invW, invH);

        this.useProgramIfNeeded(this.programSinglePass);
        gl.uniform2f(this.uInvResLocSingle, invW, invH);
    }

    clearBackgroundColor(hexString) {
        const gl = this.gl;
        let hex = hexString.replace(/^#/, '');
        if (hex.length === 3) hex = hex.split('').map(char => char + char).join('');

        let intVal = parseInt(hex, 16);
        let r = ((intVal >> 16) & 255) / 255.0;
        let g = ((intVal >> 8) & 255) / 255.0;
        let b = (intVal & 255) / 255.0;

        this.clearColorR = r;
        this.clearColorG = g;
        this.clearColorB = b;
        this.invalidateStaticBaseCache();

        gl.clearColor(r, g, b, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
    }

    flushInstanceData(instanceData, count) {
        this.updateBufferWithSubData(this.instanceVBO, instanceData, 'instanceVBOCapacityBytes');
        this.dualInstanceMode = false;
        this.splitAnimatedMode = false;
        this.splitSharedStaticMode = false;
        this.enableSinglePassMix = false;
        this.activeInstanceCount = count;
        this.animatedInstanceCount = count;
        this.invalidateStaticBaseCache();
    }

    setSplitStaticSharedMode(isShared) {
        this.splitSharedStaticMode = isShared === true;
        this.invalidateStaticBaseCache();
    }

    setSinglePassMixEnabled(isEnabled) {
        this.enableSinglePassMix = isEnabled === true;
    }

    setOldPassBypassEligible(isEligible) {
        this.oldPassBypassEligible = isEligible === true;
    }

    setAssumeOpaqueTextures(isOpaque) {
        this.assumeOpaqueTextures = isOpaque === true;
        this.invalidateStaticBaseCache();
    }

    setStaticBaseCacheEnabled(isEnabled) {
        this.staticBaseCacheEnabled = isEnabled === true;
        this.invalidateStaticBaseCache();
    }

    setOpaqueBaseCoversViewport(coversViewport) {
        this.opaqueBaseCoversViewport = coversViewport === true;
    }

    setDirtyRect(rect) {
        if (!rect) {
            this.dirtyRect = null;
            this.dirtyRectEnabled = false;
            return;
        }
        this.dirtyRectEnabled = true;
        this.dirtyRectX = rect.x;
        this.dirtyRectY = rect.y;
        this.dirtyRectW = rect.w;
        this.dirtyRectH = rect.h;
        this.dirtyRect = {
            x: rect.x,
            y: rect.y,
            w: rect.w,
            h: rect.h
        };
    }

    setDirtyRectValues(x, y, w, h) {
        this.dirtyRectEnabled = true;
        this.dirtyRectX = x;
        this.dirtyRectY = y;
        this.dirtyRectW = w;
        this.dirtyRectH = h;
    }

    setAnimatedInstanceCount(count) {
        const safeCount = Math.max(0, Math.min(this.activeInstanceCount, count | 0));
        this.animatedInstanceCount = safeCount;
    }

    updateBufferWithSubData(buffer, data, capacityKey) {
        const gl = this.gl;
        gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

        const requiredBytes = data.byteLength;
        if (requiredBytes > this[capacityKey]) {
            gl.bufferData(gl.ARRAY_BUFFER, requiredBytes, gl.DYNAMIC_DRAW);
            this[capacityKey] = requiredBytes;
            this.perfStats.bufferReallocs++;
        }
        gl.bufferSubData(gl.ARRAY_BUFFER, 0, data);
        this.perfStats.bufferUploads++;
        this.perfStats.bufferUploadBytes += requiredBytes;
    }

    invalidateStaticBaseCache() {
        this.staticBaseCacheDirty = true;
        this.staticBaseCacheValid = false;
    }

    ensureStaticBaseCacheTarget(width, height) {
        const gl = this.gl;
        if (width <= 0 || height <= 0) return;
        if (this.staticBaseCacheWidth === width && this.staticBaseCacheHeight === height) return;

        this.bindTexture2D(0, this.staticBaseCacheTexture);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.staticBaseCacheFramebuffer);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.staticBaseCacheTexture, 0);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        this.staticBaseCacheWidth = width;
        this.staticBaseCacheHeight = height;
        this.staticBaseCacheDirty = true;
        this.staticBaseCacheValid = false;
    }

    drawOldBasePass() {
        const gl = this.gl;
        const disableBlendForStatic = this.assumeOpaqueTextures === true;
        if (disableBlendForStatic) this.setBlendEnabled(false);

        this.useProgramIfNeeded(this.programStatic);
        if (this.dualInstanceMode && this.splitAnimatedMode && (this.oldLayerInstanceReady || this.splitSharedStaticMode)) {
            if (this.splitSharedStaticMode) this.perfStats.sharedStaticHits++;
            this.bindVaoIfNeeded(this.splitSharedStaticMode ? this.vaoSplitNew : this.vaoSplitOld);
        } else {
            const oldVAO = (this.dualInstanceMode && this.oldLayerInstanceReady) ? this.vaoInterleavedOld : this.vaoInterleavedBase;
            this.bindVaoIfNeeded(oldVAO);
        }
        this.setUniform2fCached('cachedUTexSizeX', 'cachedUTexSizeY', this.uTexSizeLocStatic, this.oldTexSampleSize[0], this.oldTexSampleSize[1]);
        this.bindTexture2D(0, this.oldTexture);
        gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.activeInstanceCount);

        return disableBlendForStatic;
    }

    rebuildStaticBaseCache() {
        const gl = this.gl;
        if (!this.oldTexSize || this.activeInstanceCount <= 0 || this.canvas.width <= 0 || this.canvas.height <= 0) return;

        this.ensureStaticBaseCacheTarget(this.canvas.width, this.canvas.height);
        this.setScissorRect(null);

        gl.bindFramebuffer(gl.FRAMEBUFFER, this.staticBaseCacheFramebuffer);
        gl.viewport(0, 0, this.staticBaseCacheWidth, this.staticBaseCacheHeight);
        gl.clearColor(this.clearColorR, this.clearColorG, this.clearColorB, 1.0);
        gl.clear(gl.COLOR_BUFFER_BIT);
        const disableBlendForStatic = this.drawOldBasePass();
        if (disableBlendForStatic) this.setBlendEnabled(true);

        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        gl.viewport(0, 0, this.canvas.width, this.canvas.height);

        // Force program/VAO cache refresh after offscreen pass to avoid stale GL state.
        this.currentProgram = null;
        this.currentBoundVAO = null;

        this.staticBaseCacheDirty = false;
        this.staticBaseCacheValid = true;
    }

    drawStaticBaseCache() {
        const gl = this.gl;
        this.setBlendEnabled(false);
        this.useProgramIfNeeded(this.programBlit);
        this.bindVaoIfNeeded(this.vaoScreenQuad);
        this.bindTexture2D(0, this.staticBaseCacheTexture);
        gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    }

    syncOldLayerInstanceData(instanceData, count) {
        this.updateBufferWithSubData(this.instanceVBOOld, instanceData, 'instanceVBOOldCapacityBytes');
        this.oldLayerInstanceReady = true;
        this.splitAnimatedMode = false;
        this.splitSharedStaticMode = false;
        this.enableSinglePassMix = false;
        this.activeInstanceCount = count;
        this.animatedInstanceCount = count;
        this.oldPassBypassEligible = false;
        this.invalidateStaticBaseCache();
    }

    syncOldLayerStaticData(staticData, count) {
        this.updateBufferWithSubData(this.staticVBOOld, staticData, 'oldStaticVBOCapacityBytes');
        this.oldLayerInstanceReady = true;
        this.activeInstanceCount = count;
        this.animatedInstanceCount = count;
        this.oldPassBypassEligible = false;
        this.invalidateStaticBaseCache();
    }

    syncAnimatedLayerStaticData(staticData, count) {
        this.updateBufferWithSubData(this.staticVBONew, staticData, 'newStaticVBOCapacityBytes');
        this.activeInstanceCount = count;
        this.animatedInstanceCount = count;
        this.invalidateStaticBaseCache();
    }

    flushAnimatedInstanceData(newInstanceData, count) {
        this.updateBufferWithSubData(this.instanceVBONew, newInstanceData, 'instanceVBONewCapacityBytes');

        this.dualInstanceMode = true;
        this.splitAnimatedMode = false;
        this.splitSharedStaticMode = false;
        this.enableSinglePassMix = false;
        this.activeInstanceCount = count;
        this.animatedInstanceCount = count;
        this.invalidateStaticBaseCache();
    }

    flushAnimatedDynamicData(dynamicData, count) {
        this.updateBufferWithSubData(this.dynamicVBONew, dynamicData, 'dynamicVBOCapacityBytes');

        this.dualInstanceMode = true;
        this.splitAnimatedMode = true;
        this.activeInstanceCount = count;
        this.animatedInstanceCount = count;
    }

    renderFrame(elapsedTime) {
        const gl = this.gl;
        this.perfStats.frames++;
        this.perfStats.activeInstancesAccum += this.activeInstanceCount;
        this.perfStats.animatedInstancesAccum += this.animatedInstanceCount;
        if (this.animatedInstanceCount > this.perfStats.animatedInstancesPeak) {
            this.perfStats.animatedInstancesPeak = this.animatedInstanceCount;
        }

        if (this.activeInstanceCount <= 0) {
            this.setScissorRect(null);
            gl.clear(gl.COLOR_BUFFER_BIT);
            return;
        }

        this.setActiveTextureUnit(0);

        const canUseSinglePass =
            this.dualInstanceMode &&
            this.splitAnimatedMode &&
            this.splitSharedStaticMode &&
            this.enableSinglePassMix &&
            this.animatedInstanceCount > 0 &&
            this.animatedInstanceCount === this.activeInstanceCount &&
            !!this.oldTexSize &&
            !!this.newTexSize &&
            !!this.oldTexSampleSize &&
            !!this.newTexSampleSize &&
            this.oldTexSampleSize[0] === this.newTexSampleSize[0] &&
            this.oldTexSampleSize[1] === this.newTexSampleSize[1];

        const canBypassOldPass =
            this.oldPassBypassEligible &&
            !!this.newTexSize &&
            this.animatedInstanceCount === this.activeInstanceCount;

        const canUseStaticBaseCache =
            this.staticBaseCacheEnabled &&
            !!this.oldTexSize &&
            !canBypassOldPass &&
            !canUseSinglePass;
        if (canUseStaticBaseCache && (this.staticBaseCacheDirty || !this.staticBaseCacheValid)) {
            this.rebuildStaticBaseCache();
        }
        const hasStaticBaseCache = canUseStaticBaseCache && this.staticBaseCacheValid;

        let scissorValid = false;
        let scissorX = 0;
        let scissorY = 0;
        let scissorW = 0;
        let scissorH = 0;
        if (this.dirtyRectEnabled && this.logicalWidth > 0 && this.logicalHeight > 0) {
            const x0 = Math.max(0, Math.min(this.logicalWidth, this.dirtyRectX));
            const y0 = Math.max(0, Math.min(this.logicalHeight, this.dirtyRectY));
            const x1 = Math.max(0, Math.min(this.logicalWidth, this.dirtyRectX + this.dirtyRectW));
            const y1 = Math.max(0, Math.min(this.logicalHeight, this.dirtyRectY + this.dirtyRectH));
            if (x1 > x0 && y1 > y0) {
                const sx = this.canvas.width / this.logicalWidth;
                const sy = this.canvas.height / this.logicalHeight;
                const px0 = Math.floor(x0 * sx);
                const px1 = Math.ceil(x1 * sx);
                const py0 = Math.floor(y0 * sy);
                const py1 = Math.ceil(y1 * sy);
                const scX = px0;
                const scY = Math.max(0, this.canvas.height - py1);
                const scW = Math.max(0, px1 - px0);
                const scH = Math.max(0, py1 - py0);
                if (scW > 0 && scH > 0) {
                    scissorValid = true;
                    scissorX = scX;
                    scissorY = scY;
                    scissorW = scW;
                    scissorH = scH;
                }
            }
        }

        const useFrameScopedScissor = canBypassOldPass || canUseSinglePass;
        if (useFrameScopedScissor && scissorValid) {
            this.setScissorRectValues(scissorX, scissorY, scissorW, scissorH);
        } else {
            this.setScissorRect(null);
        }

        const canSkipClear =
            this.assumeOpaqueTextures &&
            this.opaqueBaseCoversViewport &&
            !!this.oldTexSize &&
            !canBypassOldPass;

        if (canSkipClear || hasStaticBaseCache) {
            this.perfStats.clearSkipped++;
        } else {
            gl.clear(gl.COLOR_BUFFER_BIT);
        }

        if (canUseSinglePass) {
            this.perfStats.singlePassHits++;
            this.perfStats.sharedStaticHits++;

            this.setBlendEnabled(true);
            this.useProgramIfNeeded(this.programSinglePass);
            this.bindVaoIfNeeded(this.vaoSplitNew);
            this.setUniform1fCached('cachedUTime', this.uTimeLocSingle, elapsedTime);
            this.setUniform2fCached('cachedUTexSizeX', 'cachedUTexSizeY', this.uTexSizeLocSingle, this.newTexSampleSize[0], this.newTexSampleSize[1]);

            this.bindTexture2D(2, this.oldTexture);
            this.bindTexture2D(0, this.newTexture);

            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.activeInstanceCount);
            return;
        }

        if (hasStaticBaseCache) {
            this.drawStaticBaseCache();
            if (this.newTexSize && this.animatedInstanceCount > 0) {
                this.setBlendEnabled(true);
            }
        }

        // 1. 先用旧图跑一次完全定格的渲染，直接糊在网格的底层（完美保留背景）
        if (this.oldTexSize && !canBypassOldPass && !hasStaticBaseCache) {
            const disableBlendForStatic = this.drawOldBasePass();
            if (disableBlendForStatic && !(this.newTexSize && this.animatedInstanceCount > 0)) {
                this.setBlendEnabled(true);
            }
        }

        // 2. 紧接着在同一帧里，开启动画并换用新图进行真实计算，覆盖在上层！
        if (this.newTexSize && this.animatedInstanceCount > 0) {
            if (!useFrameScopedScissor && scissorValid) this.setScissorRectValues(scissorX, scissorY, scissorW, scissorH);
            this.setBlendEnabled(true);
            this.useProgramIfNeeded(this.programAnimated);
            const invW = this.logicalWidth > 0 ? 1 / this.logicalWidth : 0;
            const invH = this.logicalHeight > 0 ? 1 / this.logicalHeight : 0;
            this.setUniform2fCached('cachedUResX', 'cachedUResY', this.uInvResLocAnimated, invW, invH);
            if (this.dualInstanceMode && this.splitAnimatedMode) {
                this.bindVaoIfNeeded(this.vaoSplitNew);
            } else {
                this.bindVaoIfNeeded(this.dualInstanceMode ? this.vaoInterleavedNew : this.vaoInterleavedBase);
            }
            this.setUniform1fCached('cachedUTime', this.uTimeLocAnimated, elapsedTime);
            this.setUniform2fCached('cachedUTexSizeX', 'cachedUTexSizeY', this.uTexSizeLocAnimated, this.newTexSampleSize[0], this.newTexSampleSize[1]);
            this.bindTexture2D(0, this.newTexture);
            gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, this.animatedInstanceCount);
            if (!useFrameScopedScissor) this.setScissorRect(null);
        }

    }
}