const axios = require("axios");
const cheerio = require("cheerio");

async function findVideoUrl(html) {
  const $ = cheerio.load(html);

  const og = $("meta[property='og:video']").attr("content");
  if (og) return og;

  const tw = $("meta[name='twitter:player:stream']").attr("content");
  if (tw) return tw;

  const vid = $("video").attr("src") || $("video > source").attr("src");
  if (vid) return vid;

  return null;
}

module.exports = async (req, res) => {
  const { url, download } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    const page = await axios.get(url, {
      headers: { "User-Agent": "Mozilla/5.0" }
    });

    const direct = await findVideoUrl(page.data);
    if (!direct) return res.status(404).json({ error: "Video not found" });

    if (download) {
      const videoStream = await axios.get(direct, {
        responseType: "stream",
        headers: { "User-Agent": "Mozilla/5.0" }
      });

      res.setHeader(
        "Content-Disposition",
        'attachment; filename="tiktok-video.mp4"'
      );

      if (videoStream.headers["content-type"]) {
        res.setHeader("Content-Type", videoStream.headers["content-type"]);
      }

      return videoStream.data.pipe(res);
    }

    return res.json({ videoUrl: direct });
  } catch (e) {
    console.error(e.message);
    return res.status(500).json({ error: "Failed to fetch page" });
  }
};
