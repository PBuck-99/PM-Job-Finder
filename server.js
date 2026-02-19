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
        max_tokens: 8000,
        system: "You are a JSON-only API. You must ONLY output valid JSON arrays. Never include explanations, apologies, or any text outside the JSON structure. If you cannot find jobs, return an empty array: []",
        tools: [{
          type: "web_search_20250305",
          name: "web_search"
        }],
        messages: [{
          role: "user",
          content: `Use web_search to find REAL project management jobs in Leeds UK posted in 2026.

Search commands:
site:indeed.co.uk "project manager" Leeds 2026
site:reed.co.uk "project coordinator" Leeds 2026
site:totaljobs.com "junior project manager" Leeds
site:cv-library.co.uk "graduate project manager" Leeds
site:linkedin.com/jobs PMO Leeds

Target roles: entry-level, apprenticeship, graduate PM positions
Keywords: junior project manager, project coordinator, graduate PM, PM apprentice, assistant PM, PMO analyst
Location: Leeds + 30 mile radius (Bradford, Wakefield, York, Harrogate, Huddersfield)

OUTPUT: Return ONLY a JSON array with NO other text:
[{"title":"","company":"","location":"","level":"entry/apprenticeship/graduate","salary":"","description":"","url":"","source":"","postedDate":""}]

If no jobs: []

CRITICAL: NO explanations, apologies, or text outside JSON.`
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
    console.log('Full API response:', JSON.stringify(data, null, 2));
    
    // Check for API errors
    if (data.error) {
      console.error('❌ API Error in data:', data.error);
      throw new Error(data.error.message || 'API request failed');
    }

    // Check if response has expected structure
    if (!data.content) {
      console.error('❌ No content field in response');
      console.error('Response structure:', Object.keys(data));
      return res.json({ success: true, jobs: [] });
    }

    if (!Array.isArray(data.content)) {
      console.error('❌ content is not an array, type:', typeof data.content);
      console.error('content value:', data.content);
      return res.json({ success: true, jobs: [] });
    }
    
    console.log(`✅ Found ${data.content.length} content blocks`);
    
    let jobsText = '';
    try {
      for (const block of data.content) {
        if (block && block.type === 'text') {
          jobsText += block.text;
          console.log('Text block:', block.text.substring(0, 200));
        }
      }
    } catch (iterError) {
      console.error('❌ Error iterating content blocks:', iterError);
      return res.json({ success: true, jobs: [] });
    }

    console.log('📝 Full extracted text:', jobsText);

    // If no text was extracted, return empty jobs
    if (!jobsText || jobsText.trim().length === 0) {
      console.log('⚠️ No text content found in response');
      return res.json({ success: true, jobs: [] });
    }

    // Aggressively extract JSON even if there's conversational text
    let cleanText = jobsText.trim();
    
    // Remove markdown code blocks
    cleanText = cleanText.replace(/```json|```/g, '');
    
    // Try to find JSON array pattern
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
      console.log('✅ Extracted JSON array from response');
    } else {
      console.error('❌ No JSON array found in response');
      // If no JSON found, return empty array
      return res.json({ success: true, jobs: [] });
    }
    
    console.log('Attempting to parse:', cleanText.substring(0, 200));
    
    let jobs;
    try {
      jobs = JSON.parse(cleanText);
    } catch (parseError) {
      console.error('❌ JSON parse error:', parseError.message);
      console.error('Attempted to parse:', cleanText);
      // Return empty array if parsing fails
      return res.json({ success: true, jobs: [] });
    }
    
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
        max_tokens: 8000,
        system: "You are a JSON-only API. Return ONLY valid JSON arrays. No explanations.",
        tools: [{
          type: "web_search_20250305",
          name: "web_search"
        }],
        messages: [{
          role: "user",
          content: `Verify if these PM jobs still exist:
${jobs.map(j => `${j.title} at ${j.company}`).join(', ')}

Return ONLY JSON with active jobs:
[{"title":"","company":"","location":"","level":"","salary":"","description":"","url":"","source":"","postedDate":"","stillActive":true}]

If none active: []`
        }]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message || 'API request failed');
    }

    if (!data.content) {
      console.error('❌ No content field in verify response');
      return res.json({ success: true, verifiedJobs: [] });
    }

    if (!Array.isArray(data.content)) {
      console.error('❌ content is not an array in verify response');
      return res.json({ success: true, verifiedJobs: [] });
    }
    
    let jobsText = '';
    for (const block of data.content) {
      if (block.type === 'text') {
        jobsText += block.text;
      }
    }

    if (!jobsText || jobsText.trim().length === 0) {
      console.log('⚠️ No text content in verify response');
      return res.json({ success: true, verifiedJobs: [] });
    }

    let cleanText = jobsText.replace(/```json|```/g, '').trim();
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      cleanText = jsonMatch[0];
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
