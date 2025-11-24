# 🎯 Bounty Issue: Prototype NewsTruth Scraper in Cheerio.js

**Bounty Reward**: DAO community shoutout + Early contributor credit  
**Difficulty**: Beginner-Intermediate  
**Estimated Time**: 3-6 hours  
**Status**: Open

---

## 🎁 What You'll Earn

- ✅ **Truth DAO shoutout** in community channels
- ✅ **Pioneer contributor badge** for NewsWhistler (future product)
- ✅ **Name in founding contributors list** when NewsWhistler launches
- ✅ **Portfolio project** showing web scraping + anti-disinformation work

---

## 📋 Task Description

Build a **proof-of-concept news article scraper** using Cheerio.js that will form the foundation of **NewsWhistler**, the second product in the AppWhistler truth verification ecosystem.

### Vision
NewsWhistler will:
- Scrape articles from major news sources
- Extract claims and fact-check them
- Cross-reference with Truth DAO verified sources
- Combat disinformation at scale

### Your Mission
Create a Node.js scraper that:
1. Fetches articles from 3+ news sources (start with free/open sites)
2. Extracts: headline, author, date, body text, source URL
3. Identifies factual claims using basic NLP
4. Saves structured data to JSON
5. Handles rate limiting and errors gracefully

---

## 🔧 Technical Requirements

### Must Have
- [ ] Use Cheerio.js for HTML parsing (fast, lightweight)
- [ ] Support 3+ news sources (e.g., NPR, BBC, Reuters)
- [ ] Extract structured article data with schema:
  ```javascript
  {
    id: string,
    url: string,
    headline: string,
    author: string,
    publishDate: ISO8601,
    bodyText: string,
    claims: string[],
    source: string,
    scrapedAt: ISO8601
  }
  ```
- [ ] Basic claim extraction (sentences with "is", "will", "has", numbers, etc.)
- [ ] Error handling for failed requests
- [ ] Respect `robots.txt`
- [ ] Rate limiting (1 req/sec per domain)

### Should Have
- [ ] Config file for adding new sources easily
- [ ] Retry logic with exponential backoff
- [ ] Save to PostgreSQL (AppWhistler's database)
- [ ] CLI tool: `node scraper.js --source=bbc --limit=10`

### Nice to Have
- [ ] Detect paywalls and skip gracefully
- [ ] Image URL extraction
- [ ] Category/topic classification
- [ ] Duplicate detection

---

## 📚 Resources

### Libraries & Tools
- **Cheerio.js**: [Documentation](https://cheerio.js.org/)
- **Axios**: For HTTP requests
- **robots-parser**: Check robots.txt compliance
- **date-fns**: Parse various date formats

### Scraping Best Practices
- [Web Scraping Ethics Guide](https://www.scrapingbee.com/blog/web-scraping-ethics/)
- [Cheerio Tutorial](https://www.freecodecamp.org/news/web-scraping-in-javascript-with-cheerio/)
- [Respect robots.txt](https://developers.google.com/search/docs/crawling-indexing/robots/robots_txt)

### AppWhistler Integration
- Database schema: `backend/database/schema.sql` (see `articles` table draft)
- Future GraphQL resolver: `backend/graphql/resolvers/news.js`

---

## ✅ Acceptance Criteria

1. **Functionality**:
   - Successfully scrapes 3+ sources with 95%+ success rate
   - Extracts all required fields accurately
   - Runs without crashing for 100+ articles
   - Respects rate limits and robots.txt

2. **Code Quality**:
   - Clean, commented JavaScript (ESM or CommonJS)
   - No hardcoded URLs (use config file)
   - Proper error logging
   - Follows Airbnb JavaScript style guide

3. **Documentation**:
   - README explaining how to run the scraper
   - How to add new sources (step-by-step)
   - Example output JSON
   - Ethical considerations section

4. **Data Quality**:
   - Claim extraction accuracy ≥70% (manual spot check)
   - Properly formatted dates
   - No HTML tags in body text
   - Valid JSON output

---

## 🚀 Getting Started

### Setup
```bash
# Fork AppWhistler repo
git clone https://github.com/[your-fork]/AppWhistler.git
cd AppWhistler/scraper-prototype

# Install dependencies
npm init -y
npm install cheerio axios robots-parser date-fns

# Create files
touch scraper.js config.json
```

### Minimal Example (Starter Code)
```javascript
// scraper.js
import axios from 'axios';
import * as cheerio from 'cheerio';

async function scrapeArticle(url) {
  const { data } = await axios.get(url);
  const $ = cheerio.load(data);
  
  // TODO: Extract headline, author, body, etc.
  
  return {
    url,
    headline: $('h1').first().text(),
    // ... add more fields
  };
}

scrapeArticle('https://example.com/article').then(console.log);
```

### Test Sources (Start Here)
- **NPR**: `https://www.npr.org/sections/news/` (robots.txt friendly)
- **BBC**: `https://www.bbc.com/news` (check robots.txt)
- **Reuters**: `https://www.reuters.com/world/` (API available)

---

## ⚠️ Important Notes

### Ethical Scraping
- **Always check robots.txt** before scraping
- **Rate limit**: Max 1 request/second per domain
- **User-Agent**: Identify your scraper (`NewsWhistler-Prototype/0.1`)
- **No commercial use** of scraped data (Truth DAO non-profit mission only)

### Legal Considerations
- Scraping for fact-checking = fair use (research/education)
- Do NOT scrape paywalled content
- Respect copyright (we're extracting facts, not copying articles)

---

## 💬 Questions?

Comment below or ping @Tyler on Discord. This is a foundational piece for NewsWhistler, so questions are encouraged!

---

## 🏆 Recognition

As a **NewsWhistler pioneer**, you'll receive:
- Credit in NewsWhistler launch announcement
- Special "Founding Contributor" badge
- Truth DAO community recognition
- Priority access to future NewsWhistler bounties
- Consideration for paid roles when project generates revenue

Your work directly fights disinformation. 🛡️

---

**Labels**: `bounty`, `scraper`, `newswhistler`, `good-first-issue`, `help-wanted`  
**Project**: NewsWhistler (Future)  
**Milestone**: Prototype Phase  
**Blocked By**: None  
**Related**: #[link to Truth DAO roadmap issue]
