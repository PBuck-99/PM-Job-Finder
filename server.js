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
    console.log('🔍 Starting job search...');
    
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set');
    }
    
    console.log('✅ API key found, making request to Anthropic...');
    
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
          content: `You must respond with ONLY a valid JSON array. Do not include any explanation, preamble, or markdown formatting. Start your response with [ and end with ].

Search reputable UK job sites (Indeed, Reed, Totaljobs, CV Library, LinkedIn Jobs, Glassdoor, Gov.uk Find a Job, Monster) for CURRENT and RECENTLY POSTED entry-level, apprenticeship, and graduate project management job openings within a 30 mile radius of Leeds, UK.

Include jobs posted within the last 30 days that are still accepting applications. Focus on roles suitable for Prince2 practitioners: "junior project manager", "project coordinator", "graduate project manager", "project management apprentice", "assistant project manager", "trainee project manager", "PMO analyst", "project support officer".

Search in Leeds and surrounding areas: Bradford, Wakefield, Huddersfield, York, Harrogate, Dewsbury, Castleford, Pontefract, Wetherby, Ilkley, Keighley, Halifax.

Return ONLY this JSON structure with NO additional text:
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
]

IMPORTANT: Return ONLY the JSON array. No explanations. No markdown. No conversational text.`
        }]
      })
    });

    console.log(`📡 API Response Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`Anthropic API returned ${response.status}: ${errorText}`);
    }

    const data = await response.json();
    console.log('📦 Received data from API');
    
    // Check if we got an error response
    if (data.error) {
      console.error('❌ API Error in data:', data.error);
      throw new Error(data.error.message || 'API request failed');
    }

    // Check if content exists and is iterable
    if (!data.content || !Array.isArray(data.content)) {
      console.error('❌ Unexpected API response structure:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response from API - no content array found');
    }
    
    console.log(`✅ Found ${data.content.length} content blocks`);
    
    let jobsText = '';
    for (const block of data.content) {
      if (block.type === 'text') {
        jobsText += block.text;
      }
    }

    console.log('📝 Extracted text from API response');

    // Clean up the response - remove any markdown, explanations, etc.
    let cleanText = jobsText.replace(/```json|```/g, '').trim();
    
    // If response starts with text before the JSON, try to extract just the JSON array
    const jsonArrayMatch = cleanText.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
      cleanText = jsonArrayMatch[0];
    }
    
    console.log('Attempting to parse JSON:', cleanText.substring(0, 100) + '...');
    
    const jobs = JSON.parse(cleanText);
    
    console.log(`✅ Successfully parsed ${jobs.length} jobs`);
    
    res.json({ success: true, jobs });
  } catch (error) {
    console.error('❌ Error searching jobs:', error);
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
    console.log(`🔍 Verifying ${jobs.length} jobs...`);
    
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
          content: `You must respond with ONLY a valid JSON array. Do not include any explanation, preamble, or markdown formatting. Start your response with [ and end with ].

Verify which of these previously saved project management jobs are still active/available on UK job sites (Indeed, Reed, Totaljobs, CV Library, LinkedIn, Glassdoor, Gov.uk Jobs, Monster) in the Leeds area:

${jobs.map(j => `- ${j.title} at ${j.company} (${j.location})`).join('\n')}

Search these job sites to check if these positions are still listed and accepting applications. Return ONLY the jobs that are currently still active/live.

Return ONLY this JSON structure with NO additional text:
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

If no jobs are found, return an empty array: []

IMPORTANT: Return ONLY the JSON array. No explanations. No markdown. No conversational text.`
        }]
      })
    });

    console.log(`📡 Verify API Response Status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error Response:', errorText);
      throw new Error(`Anthropic API returned ${response.status}`);
    }

    const data = await response.json();
    
    // Check if we got an error response
    if (data.error) {
      console.error('❌ API Error in data:', data.error);
      throw new Error(data.error.message || 'API request failed');
    }

    // Check if content exists and is iterable
    if (!data.content || !Array.isArray(data.content)) {
      console.error('❌ Unexpected API response structure:', JSON.stringify(data, null, 2));
      throw new Error('Invalid response from API - no content array found');
    }
    
    let jobsText = '';
    for (const block of data.content) {
      if (block.type === 'text') {
        jobsText += block.text;
      }
    }

    // Clean up the response - remove any markdown, explanations, etc.
    let cleanText = jobsText.replace(/```json|```/g, '').trim();
    
    // If response starts with text before the JSON, try to extract just the JSON array
    const jsonArrayMatch = cleanText.match(/\[[\s\S]*\]/);
    if (jsonArrayMatch) {
      cleanText = jsonArrayMatch[0];
    }
    
    const verifiedJobs = JSON.parse(cleanText);
    
    console.log(`✅ Verification complete: ${verifiedJobs.length} jobs still active`);
    
    res.json({ success: true, verifiedJobs });
  } catch (error) {
    console.error('❌ Error verifying jobs:', error);
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
