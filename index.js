require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const app = express();
const port = 3000;

app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

const GITHUB_API = `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/contents/file/`; // Semua file ada di dalam folder "file"

async function githubRequest(method, path, content = null, sha = null) {
  const headers = {
    Authorization: `token ${process.env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  };

  const data = content
    ? { message: 'API Commit', content, sha }
    : undefined;

  return axios({
    method,
    url: GITHUB_API + path,
    headers,
    data,
  });
}

// **1. Upload File ke Folder "file/" dalam Repo GitHub**
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const content = req.file.buffer.toString('base64');
    const filename = req.file.originalname;
    await githubRequest('PUT', filename, content);
    res.status(200).json({ message: 'File uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// **2. Get File dari Folder "file/" dalam Repo GitHub**
app.get('/file/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = `file/${filename}`;

    // Cek apakah file ada di GitHub
    await githubRequest('GET', filePath);

    // Redirect ke CDN yang diinginkan
    const fileUrl = `${process.env.BASE_URL}/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/${process.env.GITHUB_BRANCH}/${filePath}`;
    res.redirect(fileUrl);
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});
// **3. Rename File dalam Folder "file/"**
app.patch('/rename/:filename', async (req, res) => {
  try {
    const { newName } = req.body;
    const oldFilename = req.params.filename;
    
    const response = await githubRequest('GET', oldFilename);
    const sha = response.data.sha;
    const content = response.data.content;

    // Hapus file lama
    await githubRequest('DELETE', oldFilename, null, sha);
    // Buat file baru dengan nama yang diperbarui
    await githubRequest('PUT', newName, content);

    res.status(200).json({ message: 'File renamed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// **4. Hapus File dari Folder "file/" dalam Repo GitHub**
app.delete('/delete/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const response = await githubRequest('GET', filename);
    const sha = response.data.sha;
    await githubRequest('DELETE', filename, null, sha);
    res.status(200).json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
