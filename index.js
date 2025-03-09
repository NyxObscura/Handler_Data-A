require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

const GITHUB_RAW_URL = `https://raw.githubusercontent.com/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/main/file/`; // Path ke folder "file" di repo GitHub

async function checkFileExists(filename) {
  try {
    const response = await axios.get(GITHUB_RAW_URL + filename);
    return response.status === 200; // File ada jika status 200
  } catch (err) {
    return false; // File tidak ada
  }
}

// **1. Upload File ke Folder "file/" dalam Repo GitHub**
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const content = req.file.buffer.toString('base64');
    const filename = req.file.originalname;
    const response = await axios.put(
      `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/contents/file/${filename}`,
      {
        message: 'Upload file via API',
        content: content,
      },
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    res.status(200).json({ message: 'File uploaded successfully' });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// **2. Get File dari Folder "file/" dalam Repo GitHub**
app.get('/file/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;

    // Cek apakah file ada di GitHub menggunakan raw.githubusercontent.com
    const fileExists = await checkFileExists(filename);
    if (fileExists) {
      // Redirect ke CDN dengan format cdn.obscuraworks.com/(namafile)
      const cdnUrl = `https://cdn.obscuraworks.com/${filename}`;
      res.redirect(cdnUrl);
    } else {
      res.status(404).json({ error: 'File not found' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// **3. Rename File dalam Folder "file/"**
app.patch('/rename/:filename', async (req, res) => {
  try {
    const { newName } = req.body;
    const oldFilename = req.params.filename;

    // Dapatkan informasi file lama
    const oldFileResponse = await axios.get(
      `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/contents/file/${oldFilename}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    const sha = oldFileResponse.data.sha;
    const content = oldFileResponse.data.content;

    // Hapus file lama
    await axios.delete(
      `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/contents/file/${oldFilename}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
        data: {
          message: 'Delete old file via API',
          sha: sha,
        },
      }
    );

    // Buat file baru dengan nama yang diperbarui
    await axios.put(
      `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/contents/file/${newName}`,
      {
        message: 'Rename file via API',
        content: content,
      },
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );

    res.status(200).json({ message: 'File renamed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.response?.data?.message || err.message });
  }
});

// **4. Hapus File dari Folder "file/" dalam Repo GitHub**
app.delete('/delete/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;

    // Dapatkan informasi file
    const fileResponse = await axios.get(
      `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/contents/file/${filename}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
      }
    );
    const sha = fileResponse.data.sha;

    // Hapus file
    await axios.delete(
      `https://api.github.com/repos/${process.env.GITHUB_USERNAME}/${process.env.GITHUB_REPO}/contents/file/${filename}`,
      {
        headers: {
          Authorization: `token ${process.env.GITHUB_TOKEN}`,
          Accept: 'application/vnd.github.v3+json',
        },
        data: {
          message: 'Delete file via API',
          sha: sha,
        },
      }
    );

    res.status(200).json({ message: 'File deleted successfully' });
  } catch (err) {
    res.status(404).json({ error: 'File not found' });
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
