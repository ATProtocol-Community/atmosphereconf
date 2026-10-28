import logoSvg from "../../images/logo/logo-large.svg?raw";
import heartSvg from "../../images/logo/heart.svg?raw";
import canalSvg from "../../images/illustrations/canal.svg?raw";
import stampSvg from "../../images/illustrations/stamp.svg?raw";
import postmarkSvg from "../../images/postmark.svg?raw";
import puffySvg from "../../images/clouds/puffy.svg?raw";
import longSvg from "../../images/clouds/long.svg?raw";
import { svgDataUri } from "./elements";

export const colors = {
	navy: "#001941",
	azure: "#005fe2",
	orange: "#fe6e25",
	cream: "#faf7f2",
	slate: "#525c6c",
	steel: "#777e89",
	line: "#cdced0",
};

export const skyGradient =
	"linear-gradient(180deg, #005fe2 0%, #7d7cd8 42%, #ea97df 77%, #eb9b9b 100%)";

const navy = (svg: string) => svg.replaceAll("#FEFEFE", colors.navy);

export const assets = {
	logo: svgDataUri(logoSvg),
	heartNavy: svgDataUri(navy(heartSvg)),
	canal: svgDataUri(canalSvg),
	stamp: svgDataUri(stampSvg),
	postmark: svgDataUri(postmarkSvg),
	puffyCloud: svgDataUri(puffySvg),
	longCloud: svgDataUri(longSvg),
};
