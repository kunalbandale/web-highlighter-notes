# Web Highlighter & Notes Chrome Extension

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](http://makeapullrequest.com)

A Chrome extension that allows users to highlight text, add notes, and export them from any webpage. This project is open source and welcomes contributions from the community.

## 🌟 Features

- Highlight text on any webpage
- Add notes to highlights
- View all highlights in a popup
- Export highlights as PDF or Markdown
- Organize highlights by page
- Persistent storage of highlights
- Toggle highlighting functionality
- Privacy-focused (all data stored locally)

## 🚀 Quick Start

### Installation

#### Development Mode
1. Clone this repository:
   ```bash
   git clone https://github.com/yourusername/web-highlighter-notes.git
   cd web-highlighter-notes
   ```
2. Open Chrome and go to `chrome://extensions/`
3. Enable "Developer mode" in the top right corner
4. Click "Load unpacked" and select the extension directory
5. The extension should now be installed and visible in your Chrome toolbar

#### From Chrome Web Store (Coming Soon)
1. Visit the Chrome Web Store (link to be added)
2. Click "Add to Chrome"
3. Confirm the installation

## 💻 Development

### Prerequisites
- Node.js (v14 or higher)
- Chrome browser
- Basic knowledge of JavaScript and Chrome Extension development

### Project Structure
```
web-highlighter-notes/
├── manifest.json           # Extension configuration
├── popup/                  # Extension popup UI
│   ├── popup.html         # Popup interface
│   ├── popup.css          # Popup styles
│   └── popup.js           # Popup functionality
├── content/               # Content scripts
│   ├── content.js         # Page interaction logic
│   └── content.css        # Highlight styles
├── background/           # Background scripts
│   └── background.js     # Background processes
├── docs/                 # Documentation
│   └── privacy-policy.html
├── assets/              # Icons and images
├── LICENSE              # MIT License
└── README.md           # Project documentation
```

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### How to Contribute

1. **Fork the Repository**
   - Click the "Fork" button on the top right of this repository
   - Clone your fork to your local machine

2. **Create a Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Your Changes**
   - Write your code
   - Add tests if applicable
   - Update documentation
   - Follow the existing code style

4. **Commit Your Changes**
   ```bash
   git commit -m "Description of your changes"
   ```

5. **Push to Your Fork**
   ```bash
   git push origin feature/your-feature-name
   ```

6. **Create a Pull Request**
   - Go to the original repository
   - Click "New Pull Request"
   - Select your branch
   - Fill in the PR template

### Development Guidelines

- Write clear, descriptive commit messages
- Keep your code clean and well-documented
- Test your changes thoroughly
- Update documentation as needed
- Follow the existing code style
- Be respectful and constructive in discussions

### Reporting Issues

When reporting issues, please include:
- A clear description of the problem
- Steps to reproduce
- Expected behavior
- Actual behavior
- Screenshots if applicable
- Browser and OS information

### Code of Conduct

- Be respectful and inclusive
- Be patient and welcoming
- Be thoughtful
- Be collaborative
- When disagreeing, try to understand why

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📫 Contact

- GitHub Issues: [Create an issue](https://github.com/yourusername/web-highlighter-notes/issues)
- For general questions or discussions, please use GitHub Discussions

---

Made with ❤️ by the open-source community 