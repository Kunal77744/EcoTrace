import os
import re
from html.parser import HTMLParser

class MyHTMLParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.recording = False
        self.text_list = []
        self.current_tag = ""
        self.current_attrs = []

    def handle_starttag(self, tag, attrs):
        self.current_tag = tag
        self.current_attrs = attrs
        if tag not in ["script", "style"]:
            self.recording = True

    def handle_endtag(self, tag):
        self.recording = False

    def handle_data(self, data):
        if self.recording:
            text = data.strip()
            if text:
                self.text_list.append((self.current_tag, dict(self.current_attrs), text))

# Read the HTML content
html_path = r"C:\Users\Kunal\.gemini\antigravity\scratch\page.html"
with open(html_path, "r", encoding="utf-8") as f:
    html_content = f.read()

parser = MyHTMLParser()
parser.feed(html_content)

# Filter and display interesting text
output_lines = []
for tag, attrs, text in parser.text_list:
    cls = attrs.get("class", "")
    id_val = attrs.get("id", "")
    
    if tag.startswith("h") and len(tag) == 2:
        output_lines.append(f"\n# {text}\n")
    elif tag in ["p", "span", "div", "pre", "code", "li"]:
        output_lines.append(f"{text}")
    else:
        output_lines.append(text)

full_text = "\n".join(output_lines)
full_text = re.sub(r'\n{3,}', '\n\n', full_text)

# Save the parsed text to a text file in the workspace
output_path = r"C:\Users\Kunal\Documents\antigravity\silly-bardeen\parsed_text.txt"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(full_text)

print(f"Parsed text saved to: {output_path}")
print("First 1000 characters of parsed text:")
print(full_text[:1000])
