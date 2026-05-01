/// <reference types="vite/client" />

declare module 'vuetify/styles';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare module 'd3-org-chart' {
  export class OrgChart {
    container(el: Element | string): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data(nodes: any[]): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodeWidth(fn: (d: any) => number): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodeHeight(fn: (d: any) => number): this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    nodeContent(fn: (d: any) => string): this;
    imageName(name: string): this;
    render(): this;
    update(): this;
    expandAll(): this;
    collapseAll(): this;
    exportSvg(): void;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getChartState(): any;
  }
}
