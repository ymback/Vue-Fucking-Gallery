// animation-engine.js

// 彻底瘦身的实例化数据内存结构，每个实例 14 个 Float
export const STRIDE_FLOATS = 14;
export const STRIDE_BYTES = STRIDE_FLOATS * 4;
export const STATIC_FLOATS = 8;

export class AnimationEngine {
    constructor() {
        this.instanceData = new Float32Array(0);
        this.staticData = new Float32Array(0);
        this.maxStaticGridCount = 0;
        this.maxInterleavedGridCount = 0;

        // 我们用一张浮点纹理来向 GPU 传递缓动曲线
        this.LUT_RESOLUTION = 256;
        this.lutData = new Float32Array(0);
        this.easingIdMap = {};
        this.lutHeight = 1;
    }

    // 把所有缓动函数“烘焙”成数据，后续作为 WebGL 纹理上传
    initEasingLUT(easingRegistry) {
        const keys = Object.keys(easingRegistry);
        this.lutHeight = keys.length;
        this.lutData = new Float32Array(this.LUT_RESOLUTION * this.lutHeight);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            this.easingIdMap[key] = i;
            const fn = easingRegistry[key];

            for (let step = 0; step < this.LUT_RESOLUTION; step++) {
                // 生成高精度的浮点曲线
                this.lutData[i * this.LUT_RESOLUTION + step] = fn(step / (this.LUT_RESOLUTION - 1));
            }
        }
    }

    ensureStaticCapacity(gridCount) {
        if (gridCount > this.maxStaticGridCount) {
            this.maxStaticGridCount = gridCount;
            this.staticData = new Float32Array(gridCount * STATIC_FLOATS);
        }
    }

    ensureInterleavedCapacity(gridCount) {
        if (gridCount > this.maxInterleavedGridCount) {
            this.maxInterleavedGridCount = gridCount;
            this.instanceData = new Float32Array(gridCount * STRIDE_FLOATS);
        }
    }

    // 生成喂给 GPU Vertex Buffer 的结构体数组
    // fillInterleaved=false 时仅更新 staticData，避免动画阶段重复写 instanceData
    buildInstanceBuffer(layout, bitmap, props, fillInterleaved = true) {
        if (!bitmap) return;
        const gridCount = layout.gridItemCount;
        const viewW = layout.excludeDividerElementWidth;
        const viewH = layout.excludeDividerElementHeight;

        // object-fit: cover 等价公式：统一缩放并居中裁切，避免任何 fitXY 拉伸
        const coverScale = Math.max(viewW / bitmap.width, viewH / bitmap.height);
        const scaledW = bitmap.width * coverScale;
        const scaledH = bitmap.height * coverScale;
        const cropScaledX = (scaledW - viewW) * 0.5;
        const cropScaledY = (scaledH - viewH) * 0.5;

        this.ensureStaticCapacity(gridCount);
        if (fillInterleaved) this.ensureInterleavedCapacity(gridCount);

        const rowCount = layout.rowCount;
        const columnCount = layout.columnCount;
        const rowStrideX = layout.normalRowItemWidth + props.gridDividerWidth;
        const rowStrideY = layout.normalColumnItemHeight + props.gridDividerWidth;
        const normalW = layout.normalRowItemWidth;
        const normalH = layout.normalColumnItemHeight;
        const lastW = layout.lastRowItemWidth;
        const lastH = layout.lastColumnItemHeight;

        const buf = fillInterleaved ? this.instanceData : null;
        const staticBuf = this.staticData;

        let i = 0;
        for (let y = 0; y < columnCount; y++) {
            const ty = y * rowStrideY;
            const pY = y * normalH;
            const h = (y < columnCount - 1) ? normalH : lastH;

            for (let x = 0; x < rowCount; x++, i++) {
                let offset = i * STRIDE_FLOATS;
                let staticOffset = i * STATIC_FLOATS;

                const tx = x * rowStrideX;
                const pX = x * normalW;
                const w = (x < rowCount - 1) ? normalW : lastW;

                // 0~3: sx, sy, sw, sh (纹理采样原图坐标)
                const sx = (cropScaledX + pX) / coverScale;
                const sy = (cropScaledY + pY) / coverScale;
                const sw = w / coverScale;
                const sh = h / coverScale;

                staticBuf[staticOffset + 0] = sx;
                staticBuf[staticOffset + 1] = sy;
                staticBuf[staticOffset + 2] = sw;
                staticBuf[staticOffset + 3] = sh;
                if (fillInterleaved) {
                    buf[offset + 0] = sx;
                    buf[offset + 1] = sy;
                    buf[offset + 2] = sw;
                    buf[offset + 3] = sh;
                }

                // 4~7: targetX, targetY, dw, dh (屏幕终点坐标)
                staticBuf[staticOffset + 4] = tx;
                staticBuf[staticOffset + 5] = ty;
                staticBuf[staticOffset + 6] = w;
                staticBuf[staticOffset + 7] = h;
                if (fillInterleaved) {
                    buf[offset + 4] = tx;
                    buf[offset + 5] = ty;
                    buf[offset + 6] = w;
                    buf[offset + 7] = h;
                }

                // 8~13 预留给 Vue 组件填写动画起飞点和时序
            }
        }
    }
}