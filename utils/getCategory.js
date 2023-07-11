const axios = require("axios");
const cheerio = require('cheerio');
const getCategory = async (videoUrl) => {
    try {
        const response = await axios.get(videoUrl);
        const html = response.data;
        const $ = cheerio.load(html);
        const categoryId = $('meta[itemprop="genre"]').attr('content');
        if (categoryId) {
            return categoryId
        } else {
            return null;
        }
    } catch (error) {
        return null;
    }
}
module.exports = getCategory;