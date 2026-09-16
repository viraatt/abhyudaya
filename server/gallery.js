/**
 * Serverless / API route handler for /api/gallery
 * Fetches gallery image metadata securely from Cloudinary & fallback sources.
 */

export default async function handler(req, res) {
  const { page = 1, limit = 12, category = "all" } = req.query || {};
  const pageNum = parseInt(page, 10) || 1;
  const limitNum = parseInt(limit, 10) || 12;

  const cloudName = process.env.VITE_CLOUDINARY_CLOUD_NAME || "cn11zsvp";

  try {
    // Attempt to query Cloudinary resource listing JSON endpoint
    const response = await fetch(
      `https://res.cloudinary.com/${cloudName}/image/list/club_events.json`,
      { headers: { "Cache-Control": "no-cache" } }
    );

    if (response.ok) {
      const data = await response.json();
      const rawResources = data.resources || [];
      
      const formattedImages = rawResources.map((res, index) => ({
        id: res.public_id || `cloud-${index}`,
        public_id: res.public_id,
        secure_url: `https://res.cloudinary.com/${cloudName}/image/upload/v${res.version}/${res.public_id}.${res.format || "jpg"}`,
        width: res.width || 800,
        height: res.height || 600,
        title: res.context?.custom?.caption || `Club Event ${index + 1}`,
        category: res.context?.custom?.category || "Events",
        alt: res.context?.custom?.alt || "Abhyudaya Club Event",
        format: res.format,
      }));

      const filtered = category && category !== "all"
        ? formattedImages.filter(img => img.category.toLowerCase() === category.toLowerCase())
        : formattedImages;

      const startIndex = (pageNum - 1) * limitNum;
      const paginatedImages = filtered.slice(startIndex, startIndex + limitNum);
      const hasMore = startIndex + limitNum < filtered.length;

      if (res && typeof res.status === "function") {
        return res.status(200).json({
          success: true,
          images: paginatedImages,
          page: pageNum,
          limit: limitNum,
          total: filtered.length,
          hasMore,
        });
      }
    }
  } catch (err) {
    console.warn("Cloudinary API query error, using fallback pipeline:", err);
  }

  // Fallback response structure
  if (res && typeof res.status === "function") {
    return res.status(200).json({
      success: true,
      images: [],
      page: pageNum,
      limit: limitNum,
      total: 0,
      hasMore: false,
    });
  }
}
