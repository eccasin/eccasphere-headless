
// --- CONFIGURATION ---
// This Vercel Serverless Function proxies requests to Contentful
// It will be accessible at YOUR_VERCEL_DOMAIN/api/articles
// IMPORTANT: You must set these as Environment Variables in your Vercel project settings.
const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const ACCESS_TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN;
const CONTENT_TYPE_ID = 'article';

// --- Vercel Serverless Function Handler ---
export default async function handler(request, response) {
    // Construct the Contentful Delivery API URL
    const apiUrl = `https://cdn.contentful.com/spaces/${SPACE_ID}/environments/master/entries?access_token=${ACCESS_TOKEN}&content_type=${CONTENT_TYPE_ID}&order=-fields.publicationDate`;

    try {
        const apiResponse = await fetch(apiUrl);
        if (!apiResponse.ok) {
            throw new Error(`Contentful API error! status: ${apiResponse.status}`);
        }
        const data = await apiResponse.json();

        // Send the response as JSON
        response.status(200)
            .setHeader('Content-Type', 'application/json')
            .setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate')
            .json(data);

    } catch (error) {
        console.error('Error fetching articles:', error);
        response.status(500).json({ error: 'Error fetching articles.' });
    }
}
