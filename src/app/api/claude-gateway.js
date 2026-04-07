export default async function handler(req, res) {
  const { url } = req.query;
  
  if (!url) {
    return res.status(400).send('URL parameter required');
  }
  
  try {
    const response = await fetch(url);
    const html = await response.text();
    
    res.setHeader('Content-Type', 'text/html; charset=UTF-8');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.status(200).send(html);
  } catch (error) {
    res.status(500).send('Error fetching URL');
  }
}
