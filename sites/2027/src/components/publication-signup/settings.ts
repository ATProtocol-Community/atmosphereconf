import { createLeafletSignup } from "./leaflet";

export const PUBLICATION =
	"at://did:plc:lehcqqkwzcwvjvw66uthu5oq/site.standard.publication/3m367bemk3c2i";

export const NEWS_URL = "https://news.atmosphereconf.org";

export const newsSignup = createLeafletSignup({
	publication: PUBLICATION,
	redirect: NEWS_URL,
});
