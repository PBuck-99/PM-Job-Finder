const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// API endpoint to search jobs
app.post('/api/search-jobs', async (req, res) => {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        tools: [{
          type: "web_search_20250305",
          name: "web_search"
        }],
        messages: [{
          role: "user",
          content: `Search reputable UK job sites (Indeed, Reed, Totaljobs, CV Library, LinkedIn Jobs, Glassdoor, Gov.uk Find a Job, Monster) for CURRENT and RECENTLY POSTED entry-level, apprenticeship, and graduate project management job openings within a 30 mile radius of Leeds, UK.

IMPORTANT: Include jobs posted within the last 30 days that are still accepting applications, NOT just today's new postings. Look for jobs that are currently active/live, regardless of when they were originally posted.

Focus on roles suitable for Prince2 practitioners with keywords: "junior project manager", "project coordinator", "graduate project manager", "project management apprentice", "assistant project manager", "trainee project manager", "PMO analyst", "project support officer".

Search specifically for jobs in Leeds and surrounding areas: Bradford, Wakefield, Huddersfield, York, Harrogate, Dewsbury, Castleford, Pontefract, Wetherby, Ilkley, Keighley, Halifax.

IMPORTANT: Only search these trusted job sites:
- indeed.co.uk
- reed.co.uk
- totaljobs.com
- cv-library.co.uk
- linkedin.com/jobs
- glassdoor.co.uk
- findajob.dwp.gov.uk
- monster.co.uk
- michaelpage.co.uk
- cwjobs.co.uk

Include jobs with posting dates like "Posted 1 day ago", "Posted 5 days ago", "Posted 2 weeks ago", "Posted 3 weeks ago" - as long as they are still active and accepting applications.

Return results as a JSON array with this structure (no markdown, no preamble):
[
  {
    "title": "job title",
    "company": "company name",
    "location": "location",
    "level": "entry/apprenticeship/graduate",
    "salary": "salary range if available",
    "description": "brief 1-2 sentence description",
    "url": "application url if available",
    "source": "job board name (e.g., Indeed, Reed, Totaljobs)",
    "postedDate": "posted date (e.g., '2 days ago', '1 week ago', 'Today')"
  }
]`
        }]
      })
    });

    const data = await response.json();
    
    let jobsText = '';
    for (const block of data.content) {
      if (block.type === 'text') {
        jobsText += block.text;
      }
    }

    const cleanText = jobsText.replace(/```json|```/g, '').trim();
    const jobs = JSON.parse(cleanText);
    
    res.json({ success: true, jobs });
  } catch (error) {
    console.error('Error searching jobs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// API endpoint to verify existing jobs
app.post('/api/verify-jobs', async (req, res) => {
  const { jobs } = req.body;
  
  if (!jobs || jobs.length === 0) {
    return res.status(400).json({ success: false, error: 'No jobs provided' });
  }

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01"
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4000,
        tools: [{
          type: "web_search_20250305",
          name: "web_search"
        }],
        messages: [{
          role: "user",
          content: `Verify which of these previously saved project management jobs are still active/available on UK job sites (Indeed, Reed, Totaljobs, CV Library, LinkedIn, Glassdoor, Gov.uk Jobs, Monster) in the Leeds area:

${jobs.map(j => `- ${j.title} at ${j.company} (${j.location})`).join('\n')}

Search these job sites to check if these positions are still listed and accepting applications. Return ONLY the jobs that are currently still active/live.

Return results as a JSON array with this structure (no markdown, no preamble):
[
  {
    "title": "job title",
    "company": "company name",
    "location": "location",
    "level": "entry/apprenticeship/graduate",
    "salary": "salary range if available",
    "description": "brief 1-2 sentence description",
    "url": "application url if available",
    "source": "job board name",
    "postedDate": "posted date",
    "stillActive": true
  }
]

If a job is no longer found, do not include it in the results.`
        }]
      })
    });

    const data = await response.json();
    
    let jobsText = '';
    for (const block of data.content) {
      if (block.type === 'text') {
        jobsText += block.text;
      }
    }

    const cleanText = jobsText.replace(/```json|```/g, '').trim();
    const verifiedJobs = JSON.parse(cleanText);
    
    res.json({ success: true, verifiedJobs });
  } catch (error) {
    console.error('Error verifying jobs:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Serve the HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 PM Job Finder server running on http://localhost:${PORT}`);
  console.log(`📝 Make sure to set ANTHROPIC_API_KEY environment variable`);
});
