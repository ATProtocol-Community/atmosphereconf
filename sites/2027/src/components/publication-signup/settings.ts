import { createLeafletSignup } from "./leaflet";

export const PUBLICATION =
	"at://did:plc:lehcqqkwzcwvjvw66uthu5oq/site.standard.publication/3m367bemk3c2i";

export const newsSignup = createLeafletSignup({
	publication: PUBLICATION,
	redirect: "https://news.atmosphereconf.org",
});
