export type OgStyle = Record<string, string | number>;

export type OgChild = OgNode | string;

export interface OgNode {
	type: string;
	key: null;
	props: Record<string, unknown> & { style?: OgStyle; children?: OgChild[] };
}

export const el = (
	type: string,
	props: Record<string, unknown> & { style?: OgStyle },
	...children: OgChild[]
): OgNode => ({ type, key: null, props: { ...props, children } });

export const box = (style: OgStyle, ...children: OgChild[]) =>
	el(
		"div",
		{ style: { display: "flex", boxSizing: "border-box", ...style } },
		...children,
	);

export const image = (
	src: string,
	width: number,
	height: number,
	style: OgStyle = {},
) => el("img", { src, width, height, style: { width, height, ...style } });

export const svgDataUri = (svg: string) =>
	`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
