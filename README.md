# PM Job Finder - Server Version

AI-powered job search app for Prince2 Project Management roles in Leeds, UK.

## Features

✅ AI-powered job search across 10+ UK job sites
✅ 30-day job history (not just today's postings)
✅ Job verification to check if saved jobs are still active
✅ Filter by level: Entry, Apprenticeship, Graduate
✅ Browser notifications for new jobs
✅ Persistent storage - jobs saved locally
✅ 30-mile radius around Leeds

## Quick Start (Local Development)

### Prerequisites
- Node.js 18+ installed
- Anthropic API key ([get one here](https://console.anthropic.com/))

### Installation

1. **Install dependencies:**
```bash
npm install
```

2. **Create .env file:**
```bash
cp .env.example .env
```

3. **Add your API key to .env:**
```
ANTHROPIC_API_KEY=your_actual_api_key_here
PORT=3000
```

4. **Run the server:**
```bash
npm start
```

5. **Open in browser:**
```
http://localhost:3000
```

## Deployment Options

### Option 1: Deploy to Render.com (Recommended - Free Tier)

1. **Create account** at [render.com](https://render.com)

2. **Click "New +" → "Web Service"**

3. **Connect your GitHub repo** (or upload these files)

4. **Configure:**
   - **Name:** pm-job-finder
   - **Environment:** Node
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Instance Type:** Free

5. **Add Environment Variable:**
   - Key: `ANTHROPIC_API_KEY`
   - Value: Your API key

6. **Deploy!** You'll get a URL like: `https://pm-job-finder.onrender.com`

7. **Add to iPhone:** Open the URL on your iPhone → Share → Add to Home Screen

### Option 2: Deploy to Railway.app (Also Free)

1. **Create account** at [railway.app](https://railway.app)

2. **Click "New Project" → "Deploy from GitHub"**

3. **Select your repo**

4. **Add Environment Variables:**
   - `ANTHROPIC_API_KEY`: Your API key

5. **Deploy automatically!** Railway detects Node.js and runs it

6. **Get your URL** from the deployment settings

### Option 3: Deploy to Heroku

1. **Install Heroku CLI** and login

2. **Create app:**
```bash
heroku create pm-job-finder-leeds
```

3. **Set environment variable:**
```bash
heroku config:set ANTHROPIC_API_KEY=your_api_key_here
```

4. **Deploy:**
```bash
git push heroku main
```

5. **Open app:**
```bash
heroku open
```

### Option 4: Deploy to Vercel (Serverless)

Note: This requires converting to serverless functions. See `VERCEL_DEPLOYMENT.md` for details.

## iPhone Installation

Once deployed to any platform:

1. **Open the URL in Safari** on your iPhone
2. **Tap the Share button** (square with up arrow)
3. **Select "Add to Home Screen"**
4. **Name it** "PM Jobs" or similar
5. **Tap "Add"**
6. **Done!** It works like a native app

## How It Works

### Server Architecture
- **Express.js** backend handles API calls securely
- **Anthropic Claude** with web search for job scraping
- **Client-side React** for the UI
- **Browser storage** for persisting jobs

### Job Search Flow
1. Click "Search Jobs"
2. Server calls Anthropic API with web search tool
3. AI searches Indeed, Reed, Totaljobs, CV Library, LinkedIn, etc.
4. Returns structured job data
5. Client saves to browser storage
6. Jobs persist between sessions

### Job Sites Searched
- Indeed.co.uk
- Reed.co.uk
- Totaljobs.com
- CV Library
- LinkedIn Jobs
- Glassdoor UK
- Gov.uk Find a Job
- Monster.co.uk
- Michael Page
- CWJobs

## File Structure

```
pm-job-finder/
├── server.js           # Express server with API endpoints
├── package.json        # Dependencies
├── public/
│   └── index.html     # Client-side React app
├── .env.example       # Environment variables template
└── README.md          # This file
```

## API Endpoints

### POST /api/search-jobs
Searches for new PM jobs in Leeds area.

**Response:**
```json
{
  "success": true,
  "jobs": [...]
}
```

### POST /api/verify-jobs
Verifies if saved jobs are still active.

**Request Body:**
```json
{
  "jobs": [...]
}
```

**Response:**
```json
{
  "success": true,
  "verifiedJobs": [...]
}
```

## Troubleshooting

### "Failed to fetch jobs"
- Check that ANTHROPIC_API_KEY is set correctly
- Verify API key is valid at console.anthropic.com
- Check server logs for errors

### Server won't start
- Ensure Node.js 18+ is installed
- Run `npm install` again
- Check if port 3000 is already in use

### No jobs found
- This can happen if job sites don't have many matches
- Try running the search again
- Check the Anthropic API usage dashboard

## Cost Estimates

- **Free tier:** First ~$5-10 of Anthropic credits (typically free new accounts)
- **Per search:** ~$0.10-0.30 depending on results
- **Monthly estimate:** $3-10 if searching 1-2 times daily
- **Hosting:** Free on Render/Railway/Vercel free tiers

## Support

For issues or questions:
1. Check the Anthropic API status
2. Review server logs
3. Verify environment variables are set correctly

## License

MIT License - Feel free to modify and use!
