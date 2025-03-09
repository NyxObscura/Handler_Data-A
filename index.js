require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const app = express();
const port = 3000;

app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

const GITHUB_API = `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/contents/`;

async function githubRequest(method, path, content = null, sha = null) {
  const headers = {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  };

  const data = content
    ? { message: 'API Commit', content: content, sha }
    : undefined;

  return axios({
    method,
    url: GITHUB_API + path,
    headers,
    data,
  });
}

app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const content = req.file.buffer.toString('base64');
    await githubRequest('PUT', req.file.originalname, content);
    res.status(200).json({ message: 'File uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

app.get('/file/:filename', async (req, res) => {
  try {
    await githubRequest('GET', req.params.filename);
    res.redirect(`${process.env.BASE_URL}/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/${process.env.GITHUB_BRANCH}/${req.params.filename}`);
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

app.patch('/rename/:filename', async (req, res) => {
  try {
    const { newName } = req.body;
    const response = await githubRequest('GET', req.params.filename);
    const sha = response.data.sha;
    const content = response.data.content;

    await githubRequest('DELETE', req.params.filename, null, sha);
    await githubRequest('PUT', newName, content);

    res.status(200).json({ message: 'File renamed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

app.delete('/delete/:filename', async (req, res) => {
  try {
    const response = await githubRequest('GET', req.params.filename);
    const sha = response.data.sha;
    await githubRequest('DELETE', req.params.filename, null, sha);
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
