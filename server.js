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
          content: `Return ONLY a JSON array. No text, no markdown, just JSON starting with [

Search UK job sites (Indeed, Reed, Totaljobs, CV Library, LinkedIn) for entry-level/apprenticeship/graduate PM jobs in Leeds area (30 mile radius). Include jobs posted in 2026 only.

Keywords: junior project manager, project coordinator, graduate PM, PM apprentice, assistant PM, PMO analyst

Return this exact structure:
[{"title":"","company":"","location":"","level":"entry/apprenticeship/graduate","salary":"","description":"","url":"","source":"","postedDate":""}]`
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
          content: `Return ONLY a JSON array. No text, just JSON starting with [

Verify if these PM jobs are still active on UK job sites:
${jobs.map(j => `${j.title} at ${j.company}`).join(', ')}

Return only active jobs in this format:
[{"title":"","company":"","location":"","level":"","salary":"","description":"","url":"","source":"","postedDate":"","stillActive":true}]

If none active, return []`
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
