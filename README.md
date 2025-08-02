# Book Generator Application

A comprehensive AI-powered platform that transforms detailed JSON specifications into complete, publication-ready non-fiction books through an automated 8-step workflow. The system uses AI (DeepSeek or Claude Sonnet 4) for content generation and GitHub for version control.

## Features

- **8-Step Automated Workflow**: From JSON input to complete book with front matter
- **Dual AI Support**: Choose between DeepSeek and Claude Sonnet 4 for content generation
- **GitHub Integration**: Automatic repository creation and file management
- **Real-time Progress Tracking**: Interactive dashboard with detailed status updates
- **Professional Output**: Generates preface, introduction, table of contents, and structured content
- **PostgreSQL Database**: Comprehensive tracking and audit trails

## Local Setup on Ubuntu (Beelink MiniPC)

### Prerequisites

1. **Update Ubuntu System**
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Install Node.js 20**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   node --version  # Should show v20.x.x
   npm --version   # Should show 10.x.x
   ```

3. **Install Git**
   ```bash
   sudo apt install git -y
   git --version
   ```

4. **Install PostgreSQL**
   ```bash
   sudo apt install postgresql postgresql-contrib -y
   sudo systemctl start postgresql
   sudo systemctl enable postgresql
   ```

### Database Setup

1. **Create Database User and Database**
   ```bash
   sudo -u postgres psql
   ```
   
   In PostgreSQL prompt:
   ```sql
   CREATE USER bookgen WITH PASSWORD 'your_secure_password';
   CREATE DATABASE bookgenerator OWNER bookgen;
   GRANT ALL PRIVILEGES ON DATABASE bookgenerator TO bookgen;
   \q
   ```

2. **Test Database Connection**
   ```bash
   psql -h localhost -U bookgen -d bookgenerator
   # Enter password when prompted
   \q
   ```

### Application Setup

1. **Clone or Download Project**
   ```bash
   git clone <your-repo-url> book-generator
   cd book-generator
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   
   The application now supports dotenv for local development. Create `.env` file in the project root:
   ```bash
   nano .env
   ```
   
   Add the following environment variables:
   ```env
   # Database Configuration
   DATABASE_URL=postgresql://bookgen:your_secure_password@localhost:5432/bookgenerator
   PGHOST=localhost
   PGPORT=5432
   PGUSER=bookgen
   PGPASSWORD=your_secure_password
   PGDATABASE=bookgenerator
   
   # GitHub API (Required)
   GITHUB_TOKEN=ghp_your_github_personal_access_token
   
   # AI Service Configuration (Choose One)
   # Option 1: Use DeepSeek (Default)
   DEEPSEEK_API_KEY=sk-your_deepseek_api_key
   
   # Option 2: Use Claude Sonnet 4
   USE_CLAUDE=true
   ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key
   
   # Application Settings
   NODE_ENV=development
   ```
   
   **Alternative**: Set environment variables directly in shell:
   ```bash
   export DATABASE_URL="postgresql://bookgen:password@localhost:5432/bookgenerator"
   export GITHUB_TOKEN="ghp_your_token"
   export DEEPSEEK_API_KEY="sk-your_key"
   ```

4. **Initialize Database Schema**
   ```bash
   npm run db:push
   ```

5. **Start Development Server**
   ```bash
   npm run dev
   ```

   The application will be available at:
   - Frontend: http://localhost:5000
   - API: http://localhost:5000/api

## API Keys Setup

### GitHub Personal Access Token

1. Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
2. Click "Generate new token (classic)"
3. Select scopes:
   - `repo` (Full control of private repositories)
   - `public_repo` (Access public repositories)
4. Copy the token and add to `.env` as `GITHUB_TOKEN`

### DeepSeek API Key

1. Visit [DeepSeek Platform](https://platform.deepseek.com)
2. Create account and navigate to API Keys
3. Generate new API key
4. Add to `.env` as `DEEPSEEK_API_KEY`

### Anthropic API Key (Optional)

1. Visit [Anthropic Console](https://console.anthropic.com)
2. Create account and generate API key
3. Add to `.env` as `ANTHROPIC_API_KEY`
4. Set `USE_CLAUDE=true` to use Claude Sonnet 4

## Usage

1. **Access the Application**
   
   Open http://localhost:5000 in your browser

2. **Generate a Book**
   
   - Use the JSON template provided in the interface
   - Customize the book specification
   - Click "Generate Book" to start the 8-step process

3. **Monitor Progress**
   
   - Track real-time progress through the 8 steps
   - View detailed logs and status updates
   - Monitor GitHub repository creation

4. **Access Generated Content**
   
   - Books are created as GitHub repositories
   - Content includes structured chapters, sections, and front matter
   - All files are version controlled and accessible via GitHub

## 8-Step Generation Process

1. **Input Validation** - JSON schema validation
2. **Database Storage** - Store book metadata and relationships
3. **GitHub Repository** - Create dedicated repository
4. **Book Outline** - Generate comprehensive structure
5. **Chapter Outlines** - Create detailed chapter plans
6. **Content Generation** - Write section content with context
7. **Content Compilation** - Stitch sections into complete draft
8. **Front Matter Generation** - Create preface, introduction, and table of contents

## Troubleshooting

### Port Already in Use
```bash
# Find process using port 5000
sudo netstat -tulpn | grep :5000
# Kill the process
sudo kill -9 <PID>
```

### Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql

# Restart PostgreSQL
sudo systemctl restart postgresql

# Check database exists
sudo -u postgres psql -l | grep bookgenerator
```

### Permission Issues
```bash
# Fix npm permissions
sudo chown -R $(whoami) ~/.npm
```

### Memory Issues on MiniPC
```bash
# Monitor memory usage
free -h
htop

# Increase swap if needed
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Development Commands

```bash
# Start development server
npm run dev

# Push database schema changes
npm run db:push

# Run tests
npm run test

# Build for production
npm run build

# Start production server
npm start
```

## System Requirements

- **OS**: Ubuntu 20.04+ (tested on Ubuntu 22.04)
- **RAM**: 4GB minimum, 8GB recommended
- **Storage**: 10GB free space
- **Network**: Internet connection for AI API calls
- **Hardware**: Beelink MiniPC or equivalent x86_64 system

## Architecture

- **Frontend**: React with TypeScript, Vite, Tailwind CSS
- **Backend**: Node.js with Express, TypeScript
- **Database**: PostgreSQL with Drizzle ORM
- **AI Services**: DeepSeek API or Anthropic Claude API
- **Version Control**: GitHub API integration
- **Deployment**: Single Node.js process serving both frontend and API

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Verify all environment variables are set correctly
3. Ensure API keys have proper permissions
4. Check application logs in the terminal

## License

MIT
