const axios = require("axios");
const cheerio = require("cheerio");

async function fetchHTML(url) {
  return await axios.get(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Referer": "https://www.tiktok.com/",
      "Accept-Language": "en-US,en;q=0.9"
    }
  });
}

function extractVideo(html) {
  const $ = cheerio.load(html);

  // 1. TikTok format terbaru (script JSON)
  const script = $("script#__UNIVERSAL_DATA_FOR_REHYDRATION__").html();
  if (script) {
    try {
      const json = JSON.parse(script);
      const videoUrl =
        json["__DEFAULT_SCOPE__"]?.webapp?.videoDetail?.itemInfo?.itemStruct
          ?.video?.downloadAddr;

      if (videoUrl) return videoUrl;
    } catch {}
  }

  // 2. OG tags (fallback)
  const og = $("meta[property='og:video']").attr("content");
  if (og) return og;

  // 3. video tag (fallback)
  const vid = $("video").attr("src");
  if (vid) return vid;

  return null;
}

module.exports = async (req, res) => {
  const { url, download } = req.query;
  if (!url) return res.status(400).json({ error: "Missing url" });

  try {
    const response = await fetchHTML(url);
    const direct = extractVideo(response.data);

    if (!direct) {
      return res.status(404).json({ error: "Video not found in page" });
    }

    // DOWNLOAD MODE
    if (download) {
      const videoStream = await axios.get(direct, {
        responseType: "stream",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
        }
      });

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=tiktok-video.mp4"
      );

      return videoStream.data.pipe(res);
    }

    return res.json({ videoUrl: direct });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};
