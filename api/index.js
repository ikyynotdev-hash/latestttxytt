const axios = require("axios");
const cheerio = require("cheerio");

async function resolveRedirect(url) {
  try {
    const res = await axios.get(url, {
      maxRedirects: 5,
      validateStatus: () => true,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      }
    });

    // axios follow redirect → final URL ada di res.request.res.responseUrl
    return res.request.res.responseUrl || url;
  } catch {
    return url;
  }
}

async function extractVideo(url) {
  const html = await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://www.tiktok.com/",
    },
  });

  const $ = cheerio.load(html.data);

  // JSON script TikTok
  const scripts = $("script[id='SIGI_STATE']").html();
  if (scripts) {
    try {
      const json = JSON.parse(scripts);

      const videoUrl =
        json.ItemModule &&
        Object.values(json.ItemModule)[0]?.video?.downloadAddr;

      if (videoUrl) return videoUrl;
    } catch {}
  }

  return null;
}

module.exports = async (req, res) => {
  const { url, download } = req.query;

  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    // FIRST: resolve shortlink
    const finalUrl = await resolveRedirect(url);

    // THEN: extract from real page
    const direct = await extractVideo(finalUrl);

    if (!direct) return res.status(404).json({ error: "Video not found" });

    if (download) {
      const stream = await axios.get(direct, {
        responseType: "stream",
        headers: { "User-Agent": "Mozilla/5.0" },
      });

      res.setHeader(
        "Content-Disposition",
        'attachment; filename="tiktok.mp4"'
      );

      return stream.data.pipe(res);
    }

    return res.json({ videoUrl: direct });

  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
