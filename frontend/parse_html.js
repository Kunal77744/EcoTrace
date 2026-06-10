import fs from 'fs';
import path from 'path';
import { JSDOM } from 'jsdom';

try {
  const htmlPath = 'C:\\Users\\Kunal\\.gemini\\antigravity\\scratch\\page.html';
  const html = fs.readFileSync(htmlPath, 'utf8');
  
  const dom = new JSDOM(html);
  const document = dom.window.document;
  
  // Remove script and style elements
  const elementsToRemove = document.querySelectorAll('script, style, svg, iframe, link, meta, noscript');
  elementsToRemove.forEach(el => el.remove());
  
  // Get main content text or body text
  const textContent = document.body.textContent || '';
  
  // Clean up whitespace: replace multiple spaces/newlines with a single newline/space
  let cleanedText = textContent
    .replace(/\r\n/g, '\n')
    .replace(/\n\s*\n/g, '\n\n')
    .replace(/[ \t]+/g, ' ')
    .trim();
  
  // Write the clean text to a file in the workspace
  const outputPath = 'C:\\Users\\Kunal\\Documents\\antigravity\\silly-bardeen\\parsed_text.txt';
  fs.writeFileSync(outputPath, cleanedText, 'utf8');
  
  console.log(`Success! Cleaned text saved to: ${outputPath}`);
  console.log('Preview:');
  console.log(cleanedText.substring(0, 1000));
} catch (err) {
  console.error('Error during parsing:', err);
}
