
// --- CONFIGURATION ---
// This Vercel Serverless Function fetches data from Contentful and generates an RSS feed.
// It will be accessible at YOUR_VERCEL_DOMAIN/api/rss
// IMPORTANT: You must set these as Environment Variables in your Vercel project settings.
const SPACE_ID = process.env.CONTENTFUL_SPACE_ID;
const ACCESS_TOKEN = process.env.CONTENTFUL_ACCESS_TOKEN;
const CONTENT_TYPE_ID = 'article'; 
const SITE_URL = 'https://www.eccasin.com/eccasphere'; // The base URL for your articles

// --- Vercel Serverless Function Handler ---
export default async function handler(request, response) {
    // Construct the Contentful Delivery API URL
    const apiUrl = `https://cdn.contentful.com/spaces/${SPACE_ID}/environments/master/entries?access_token=${ACCESS_TOKEN}&content_type=${CONTENT_TYPE_ID}&order=-fields.publicationDate&limit=20`;

    try {
        const apiResponse = await fetch(apiUrl);
        if (!apiResponse.ok) {
            throw new Error(`Contentful API error! status: ${apiResponse.status}`);
        }
        const data = await apiResponse.json();

        // Build an asset map for easy lookup
        const assets = new Map();
        if (data.includes && data.includes.Asset) {
            data.includes.Asset.forEach(asset => {
                assets.set(asset.sys.id, asset);
            });
        }

        // Generate the RSS feed XML
        const rssFeed = generateRss(data.items, assets);

        // Send the response
        response.status(200)
            .setHeader('Content-Type', 'application/rss+xml; charset=utf-8')
            .send(rssFeed);

    } catch (error) {
        console.error('Error generating RSS feed:', error);
        response.status(500).send('Error generating RSS feed.');
    }
}

// --- Helper function to extract text from rich text content ---
function extractTextFromRichText(content) {
    if (!content || !content.content) return '';

    let text = '';
    content.content.forEach(node => {
        if (node.nodeType === 'paragraph' && node.content) {
            node.content.forEach(textNode => {
                if (textNode.nodeType === 'text') {
                    text += textNode.value + ' ';
                }
            });
        }
    });

    // Return first 300 characters as excerpt
    return text.trim().substring(0, 300) + (text.length > 300 ? '...' : '');
}

// --- RSS Generation Logic ---
function generateRss(items, assets) {
    let rssItems = '';
    items.forEach(item => {
        const fields = item.fields;
        const articleUrl = `${SITE_URL}/${fields.slug}`;
        const pubDate = new Date(fields.publicationDate).toUTCString();

        // Extract description from content field
        const description = fields.content
            ? extractTextFromRichText(fields.content)
            : (fields.title || 'Read more at Eccasphere.');

        // Get cover image if available
        let imageEnclosure = '';
        if (fields.coverVisual && fields.coverVisual.sys && fields.coverVisual.sys.id) {
            const asset = assets.get(fields.coverVisual.sys.id);
            if (asset && asset.fields && asset.fields.file) {
                const imageUrl = `https:${asset.fields.file.url}`;
                const imageType = asset.fields.file.contentType || 'image/jpeg';
                const imageSize = asset.fields.file.details?.size || 0;
                imageEnclosure = `<enclosure url="${imageUrl}" type="${imageType}" length="${imageSize}" />`;
            }
        }

        // Add category if available
        const category = fields.categoryTag
            ? `<category>${fields.categoryTag}</category>`
            : '';

        rssItems += `
            <item>
                <title><![CDATA[${fields.title || 'Untitled'}]]></title>
                <link>${articleUrl}</link>
                <guid isPermaLink="true">${articleUrl}</guid>
                <pubDate>${pubDate}</pubDate>
                <description><![CDATA[${description}]]></description>
                ${imageEnclosure}
                ${category}
            </item>
        `;
    });

    return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:content="http://purl.org/rss/1.0/modules/content/" xmlns:media="http://search.yahoo.com/mrss/">
    <channel>
        <title>Eccasphere</title>
        <link>${SITE_URL}</link>
        <description>The world of ECCASIN.</description>
        <language>en-us</language>
        <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
        <atom:link href="https://eccasin.com/rss.xml" rel="self" type="application/rss+xml" />
        ${rssItems}
    </channel>
</rss>`;
}
