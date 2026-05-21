// layout-engine.js
export class LayoutEngine {
    constructor() {
        this.rowCount = 1;
        this.columnCount = 1;
        this.gridItemCount = 1;
        this.normalRowItemWidth = 0;
        this.lastRowItemWidth = 0;
        this.normalColumnItemHeight = 0;
        this.lastColumnItemHeight = 0;
        this.excludeDividerElementWidth = 0;
        this.excludeDividerElementHeight = 0;
        this.snakeSortMatrix = [];
    }

    calculateGrid(containerWidth, containerHeight, props) {
        const safeGridWidth = Math.max(1, props.gridMaxWidth);
        const safeGridHeight = Math.max(1, props.gridMaxHeight);

        this.rowCount = Math.max(1, Math.floor((containerWidth + props.gridDividerWidth) / (safeGridWidth + props.gridDividerWidth)));
        this.columnCount = Math.max(1, Math.floor((containerHeight + props.gridDividerWidth) / (safeGridHeight + props.gridDividerWidth)));
        this.gridItemCount = this.rowCount * this.columnCount;

        this.excludeDividerElementWidth = containerWidth - props.gridDividerWidth * (this.rowCount - 1);
        this.excludeDividerElementHeight = containerHeight - props.gridDividerWidth * (this.columnCount - 1);

        this.normalRowItemWidth = Math.floor(this.excludeDividerElementWidth / this.rowCount);
        this.normalColumnItemHeight = Math.floor(this.excludeDividerElementHeight / this.columnCount);

        this.lastRowItemWidth = this.excludeDividerElementWidth - (this.rowCount - 1) * this.normalRowItemWidth;
        this.lastColumnItemHeight = this.excludeDividerElementHeight - (this.columnCount - 1) * this.normalColumnItemHeight;

        this.calculateSnakeMatrix();
    }

    calculateSnakeMatrix() {
        let k = 1;
        const result = [];
        for (let i = 0; i < this.columnCount; i++) result[i] = [];
        let small = Math.min(this.rowCount, this.columnCount);
        let count = Math.ceil(small / 2);
        for (let i = 0; i < count; i++) {
            let maxRight = this.rowCount - 1 - i;
            let maxBottom = this.columnCount - 1 - i;
            for (let j = i; j <= maxRight; j++) result[i][j] = k++;
            for (let j = i; j < maxBottom; j++) result[j + 1][maxRight] = k++;
            for (let j = maxRight - 1; j >= i; j--) {
                if (result[maxBottom][j]) break;
                result[maxBottom][j] = k++;
            }
            for (let j = maxBottom - 1; j > i; j--) {
                if (result[j][i]) break;
                result[j][i] = k++;
            }
        }
        this.snakeSortMatrix = result;
    }

    calcCoverScaleSize(bitmapWidth, bitmapHeight, viewW, viewH) {
        let newWidth = 0, newHeight = 0, fromLeft = 0, fromTop = 0;
        if (bitmapWidth / bitmapHeight <= viewW / viewH) {
            newWidth = viewW;
            newHeight = Math.ceil(bitmapHeight * viewW / bitmapWidth);
            let canUseHeight = newWidth * viewH / viewW;
            fromTop = Math.round((newHeight - canUseHeight) / 2);
        } else {
            newHeight = viewH;
            newWidth = Math.ceil(bitmapWidth * viewH / bitmapHeight);
            let canUseWidth = newHeight * viewW / viewH;
            fromLeft = Math.round((newWidth - canUseWidth) / 2);
        }
        return { height: newHeight, width: newWidth, fromTop, fromLeft };
    }
}