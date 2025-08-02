# Book Generator Application

## Overview

This is a full-stack web application for generating non-fiction books using AI. The system accepts detailed book specifications through a JSON API, processes the requirements through DeepSeek AI for content generation, and publishes the output to GitHub repositories. The application features a React frontend for user interaction and an Express.js backend for processing and orchestration.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Library**: Radix UI components with shadcn/ui design system
- **Styling**: Tailwind CSS with CSS variables for theming (supports light/dark modes)
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for client-side routing
- **Form Handling**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM for type-safe database operations
- **Database Provider**: Neon serverless PostgreSQL
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Build Tool**: ESBuild for production bundling

### API Design
- RESTful API endpoints under `/api/*`
- JSON-based request/response format
- Comprehensive input validation using Zod schemas
- Error handling middleware with structured error responses

## Key Components

### Book Generation Pipeline
1. **Input Validation**: JSON schema validation for book specifications
2. **Database Storage**: Normalized relational storage of book metadata
3. **GitHub Integration**: Automated repository creation and file management
4. **AI Content Generation**: DeepSeek API integration for chapter and content creation
5. **Progress Tracking**: Real-time generation status and logging

### Database Schema
- **Normalized Design**: Separate tables for authors, audiences, books, and related entities
- **Relational Structure**: Foreign key relationships between core entities
- **JSON Storage**: Flexible metadata storage using JSONB columns
- **Audit Fields**: Created/updated timestamps for all entities

### External Service Integrations
- **DeepSeek AI**: Content generation with configurable models
- **GitHub API**: Repository management and file operations
- **Neon Database**: Serverless PostgreSQL with WebSocket support

## Data Flow

1. **User Input**: JSON specification submitted through React frontend
2. **Validation**: Server-side validation using Zod schemas
3. **Database Storage**: Normalized data storage across multiple tables
4. **GitHub Setup**: Repository creation with specified visibility settings
5. **AI Processing**: Sequential content generation using DeepSeek API
6. **Progress Updates**: Real-time status updates via polling
7. **File Management**: Generated content committed to GitHub repository

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL database connectivity
- **drizzle-orm**: Type-safe database ORM with PostgreSQL dialect
- **@octokit/rest**: GitHub API client for repository operations
- **@tanstack/react-query**: Server state management and caching

### UI Component Libraries
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Component variant management
- **cmdk**: Command palette component

### Development Tools
- **tsx**: TypeScript execution for development
- **vite**: Frontend build tool and development server
- **esbuild**: Production bundling for backend

## Deployment Strategy

### Development Environment
- **Frontend**: Vite development server with HMR
- **Backend**: TSX for TypeScript execution with auto-reload
- **Database**: Direct connection to Neon serverless PostgreSQL
- **Environment**: Replit-optimized with custom plugins

### Production Build
- **Frontend**: Vite production build to `dist/public`
- **Backend**: ESBuild compilation to `dist/index.js`
- **Static Assets**: Express serves built frontend files
- **Process**: Single Node.js process serving both API and static content

### Environment Configuration
- **DATABASE_URL**: PostgreSQL connection string (required)
- **GITHUB_TOKEN**: GitHub API authentication (required)
- **DEEPSEEK_API_KEY**: DeepSeek AI API key (required for outlines and summaries with deepseek-reasoner)
- **ANTHROPIC_API_KEY**: Anthropic API key (required for section content creation with Claude 4.0 Sonnet)
- **OPENAI_API_KEY**: OpenAI API key (required for GPT-4o content polishing)
- **SERP_API_KEY**: SerpAPI key (required for factual research and web search verification)
- **NODE_ENV**: Environment mode (development/production)

**Security Note**: API keys should be managed locally using .env files or local environment variables for security. The system supports dotenv for local development while maintaining compatibility with cloud environments.

Note: The hybrid AI workflow requires DEEPSEEK_API_KEY, ANTHROPIC_API_KEY, OPENAI_API_KEY, and optionally SERP_API_KEY for full functionality. DeepSeek reasoner handles outlines and summaries, Claude 4.0 Sonnet handles section content creation, GPT-4o handles content polishing, and SerpAPI provides factual verification.

## Changelog
- June 27, 2025: Initial setup
- June 27, 2025: Updated JSON template to match attached schema specification
- June 27, 2025: Created comprehensive database transformation tests
- June 27, 2025: Verified complete JSON-to-database field mapping accuracy
- June 27, 2025: Resolved DeepSeek API authentication issues - book generation now functional
- June 27, 2025: Enhanced logging system with step-by-step progress tracking and error reporting
- June 27, 2025: Fixed GitHub repository naming conflicts with timestamp suffixes
- June 27, 2025: Implemented BookProgressHistory table with 6-step workflow tracking
- June 27, 2025: Added comprehensive audit trail for Input Validation, Database Storage, GitHub Repository, Book Outline, Chapter Outlines, and Content Generation steps
- June 27, 2025: Updated all DeepSeek prompts to eliminate conversational text and ensure clean markdown output for automated processing
- June 27, 2025: Updated validation minimums across entire stack - chapters from 3 to 1, word count from 10,000 to 100 for easier end-to-end testing
- June 27, 2025: Implemented accumulating section summary system - each section draft now receives ALL previous section summaries for enhanced context and narrative continuity
- June 27, 2025: Enhanced state refreshing system with intelligent polling intervals (2s during generation, 5s when idle) and background polling for real-time progress updates
- June 27, 2025: Added final Content Compilation step (7/7) - automatically stitches all section drafts into single content_draft.md file using GitHub API
- June 27, 2025: Fixed critical encoding bug in content compilation using mediaType: { format: "raw" } - eliminates binary corruption and produces clean markdown output
- June 27, 2025: Added Front Matter Generation step (8/8) - creates professional front_matter.md with preface, introduction, table of contents using book outline, summaries, and specified tone/voice
- June 27, 2025: Removed API Configuration section from UI - keys now handled exclusively via environment variables  
- June 27, 2025: Added Claude Sonnet 4 support with USE_CLAUDE environment variable - enables switching between DeepSeek and Claude for AI content generation
- June 27, 2025: Enhanced API key validation endpoint to include Anthropic API key checking and display current AI service in use
- June 27, 2025: Added comprehensive README.md with Ubuntu setup instructions for Beelink MiniPC including PostgreSQL configuration, API key setup, and troubleshooting guide
- June 27, 2025: Added dotenv package support for local development - enables .env file configuration while maintaining Replit environment compatibility
- June 27, 2025: Created Books management page with navigation button in sidebar, progress tracking, delete functionality with cascade deletion of all associated data
- June 28, 2025: Implemented comprehensive dark mode system with theme provider, localStorage persistence, and theme toggle in header supporting Light/Dark/System modes
- June 28, 2025: Added hybrid AI workflow - DeepSeek reasoner for fact-gathering (10 verified facts with sources per section) + Claude Sonnet 4 for content creation with selective fact integration
- June 28, 2025: Updated DeepSeek service to use deepseek-reasoner endpoint for enhanced analytical capabilities and structured fact generation
- June 28, 2025: Enhanced Claude service with fact-aware section drafts - Claude has full autonomy to use 0-10 facts per section based on content quality and natural integration
- June 28, 2025: Enhanced Claude prompts with comprehensive context integration - includes all subsequent section summaries, complete book/chapter/section outline hierarchy, and clear relationship explanations to maximize Claude Sonnet 4's large context window capabilities
- June 28, 2025: Fixed hybrid AI workflow - DeepSeek reasoner now handles ALL tasks (outlines, summaries, fact-gathering, front matter) except section drafts which are exclusively handled by Claude Sonnet 4
- June 28, 2025: Switched to Claude 3.5 Sonnet for cost optimization - reduces API costs by approximately 80% while maintaining high content quality
- June 28, 2025: Fixed DeepSeek model configuration - corrected "deepseek-llm-1.3b" to "deepseek-reasoner" in routes and frontend template
- June 28, 2025: Completed DeepSeek reasoner integration - fixed all model references in DeepSeek service methods to use correct "deepseek-reasoner" model
- June 28, 2025: Fixed summary generation bug - summaries now properly saved to GitHub repository instead of being lost in memory
- June 28, 2025: Added Resume functionality - books can now be resumed from exact stopping point based on BookProgressHistory, saving significant regeneration time
- June 28, 2025: Enhanced Resume with GitHub state verification - system analyzes actual repository files as source of truth, automatically cleans up inconsistent progress history, prevents resume from wrong step due to database/GitHub sync issues
- June 28, 2025: Fixed GitHub repository name validation - removed "book-n-" prefix, enhanced character sanitization to only allow ASCII letters, digits, periods, hyphens, underscores per GitHub requirements
- June 28, 2025: Added Pause/Resume functionality - Pause button for books stuck in 'generating' state, Resume button for incomplete books, both with proper status management and user feedback
- June 28, 2025: Fixed repository lookup in resume functionality - now uses actual stored repository data instead of reconstructing names, eliminating 404 errors from invalid characters
- June 28, 2025: Fixed GitHub file creation SHA error - enhanced createFile method to check for existing files and provide SHA for updates, eliminating "sha wasn't supplied" errors during summary generation
- June 28, 2025: Clarified dual summary generation workflow - pre-generates summaries from outlines before drafts (for context) and post-generates summaries from actual content after drafts (for accuracy)
- June 28, 2025: Fixed critical summary loading bug - system now properly loads existing summaries from GitHub repository instead of starting with empty array, providing proper context for Claude section drafts
- June 28, 2025: Fixed summary count double-counting bug - system now correctly maintains summary counts (0→29 previous, 29→0 subsequent) instead of accumulating duplicates
- June 28, 2025: Added intelligent retry logic for DeepSeek fact-gathering - 3 attempts with exponential backoff to handle API failures and JSON parsing errors
- June 28, 2025: Fixed front matter generation filename mismatch - corrected lookup from "book_outline.md" to "main_outline.md" to match actual file creation
- June 28, 2025: Fixed database enum error for front matter generation - added "front_matter" to deepseek_request_type enum and pushed schema update
- June 28, 2025: Enhanced resume validation for completed books - verifies front matter file existence before marking as complete, handles orphaned file scenarios
- June 28, 2025: Fixed undefined return value error in completed book resume - properly returns completion status instead of undefined object
- June 28, 2025: Enhanced Claude prompts with GitHub-flavored Markdown formatting - proper LaTeX math ($...$, $$...$$) and syntax-highlighted code blocks for professional output
- June 28, 2025: Removed facts system completely - eliminated unreliable DeepSeek fact-gathering with poor citations, Claude now writes citation-free content for manual review and sourcing
- June 29, 2025: Fixed duplicate summary generation bug - system now only creates missing summaries instead of regenerating existing ones, saving significant API costs and processing time
- June 29, 2025: Eliminated redundant post-draft summary generation - removed Claude calls to summarize content it just created, uses outline-based summaries for context instead
- June 29, 2025: Added robust retry strategies for both DeepSeek and Claude APIs - 3 attempts with exponential backoff and jitter, handles overload errors, rate limits, and network issues gracefully
- June 29, 2025: Implemented gap detection and recovery in Resume functionality - automatically detects missing section drafts from API failures and fills them before continuing generation
- June 29, 2025: Fixed false error on front matter generation - added non-critical error handling for database enum logging issues, front matter files now create successfully without false failures
- June 29, 2025: Eliminated duplicate LLM calls in chapter outline generation - fixed variable scoping issues that caused 50-66% wasteful API calls, saving significant DeepSeek costs
- June 29, 2025: Optimized section summaries for cost efficiency - reduced from 3-paragraph to comprehensive single-paragraph summaries (4-6 sentences) with detailed context, learning objectives, and narrative connections for Claude draft generation
- June 29, 2025: Updated Claude service to use Sonnet 4 (claude-sonnet-4-20250514) for section draft generation with optimized parameters: max_tokens: 8192, temperature: 0.6, top_p: 0.9 (generous token limit allows Claude to respect word count targets in prompts)
- June 29, 2025: Added fiction book support - system now handles both fiction and non-fiction genres with genre-aware prompts for DeepSeek outlines and Claude narrative content generation, includes fiction example template with Quick Start buttons
- July 3, 2025: Implemented 14-step automated book generation - simplified UI to title/subtitle input only, backend automatically applies standardized tone, credentials, word count (60K), chapters (8), sections (4), private repos, introductory complexity, realistic case studies, legal disclaimers, best-seller positioning with contrarian insights, and strategic keyword optimization
- July 14, 2025: Added comprehensive section details extraction system with SectionDetailsExtractor service - automatically extracts person names, business names, city names, job roles, and business types from Claude-generated section drafts using DeepSeek reasoner, stores in SectionDetail database table for narrative consistency tracking across entire book generation process
- July 14, 2025: Removed chapter outlines and section outlines generation steps - system now works directly with main_outline.md which contains complete chapter and section structure, eliminating redundant outline file creation and streamlining the workflow from 8 steps to 6 steps
- July 14, 2025: Updated restart logic to work with new streamlined workflow - GitHub repository state analysis now correctly handles missing chapter/section outlines and updated summary generation process that creates summaries from actual section drafts instead of outlines
- July 14, 2025: Fixed section details extraction and summary integration - section summaries now properly include extracted details (person names, business names, city names, job roles, business types) for narrative consistency across subsequent sections
- July 14, 2025: Enhanced content truncation prevention - increased DeepSeek key message limit from 1000 to 3000 characters and max tokens from 4000 to 8000 to prevent outline truncation issues
- July 14, 2025: Fixed section details extraction bug - corrected SectionDetailsExtractor to use valid DeepSeek model name "deepseek-reasoner" instead of invalid "section_details" model
- July 14, 2025: Implemented comprehensive factual accuracy system with FactualAccuracyService - detects outdated UI descriptions, specific claims, and factual errors; provides automatic content improvement; includes web search verification; added factual accuracy requirements to all AI prompts (Claude, DeepSeek) emphasizing timeless principles over current-state descriptions; created /api/content/review endpoint and ContentReview frontend page for manual content validation
- July 14, 2025: Updated AI architecture - DeepSeek reasoner handles outlines, summaries, and front matter while Claude 4.0 Sonnet handles fact-gathering, web search verification, and section content creation for enhanced accuracy and real-time verification capabilities
- July 15, 2025: Enhanced Claude prompts with explicit Variable Facts (VF) policy - defined VF as real-life events, documentation, or stories specific to companies/businesses/events; added requirement to avoid VF when possible and verify with web search when VF must be included; removed redundant bookOutline parameters to save tokens
- July 15, 2025: Added proper name consistency policy to prevent repeated unrelated proper names (e.g., "Dr. Sarah Chen") across different sections; enhanced section details consistency instructions to promote narrative coherence and avoid confusing duplicate character names
- July 15, 2025: Strengthened proper name policy to enforce strict name uniqueness across sections and restrict to first names only - no full names, titles, or repeated names; prioritizes generic descriptors over specific names to eliminate character confusion
- July 15, 2025: Updated proper name policy to allow first names for people (helps reader connection) while maintaining strict no-reuse rule across different sections and settings
- July 15, 2025: Implemented Redundancy Check feature for completed books - adds button to analyze section summaries using DeepSeek reasoner to detect duplicate proper names (people, businesses, cities) across sections; displays results in collapsible section with structured analysis of redundancy issues and recommendations
- July 15, 2025: Enhanced Redundancy Check with automatic report generation - upon successful analysis, creates redundancy_report.md file in GitHub repository with detailed findings, recommendations, and metadata; includes comprehensive server logging and graceful error handling for non-existent repositories
- July 15, 2025: Increased Claude max tokens from 8192 to 10000 to prevent section draft cutoff - provides safety buffer to ensure content doesn't get truncated unexpectedly while maintaining natural response lengths
- July 15, 2025: Enforced standardized tone_voice for all books - system now always uses the standardized tone from BookAutomationService for all books (both automated and manual) to ensure consistent Claude section draft generation, overriding any custom tone_voice inputs
- July 15, 2025: Enhanced name uniqueness enforcement based on redundancy analysis - analyzed report showing 26 names being reused across sections; implemented zero-tolerance policy with explicit forbidden names list (Marcus, Rachel, David, Thomas, Jennifer, Elena, Samantha, Trevor, Clarence, Quincy, Tabitha, Jasmine, Garrett, Lillian, Maxine, Francine, Wesley, Bridget, Jerome, Stella, Donovan, Priscilla, Victor, Sophia, Beatrice, Ezra) and provided 50+ fresh name suggestions to prevent future reuse violations
- July 15, 2025: MAJOR FIX: Resolved catastrophic name overuse issue - removed complex name management instructions that were causing Claude to generate 350+ character names in 130-page books; replaced with simple approach that only asks Claude to avoid specific existing names from three lists (people, job_titles, places) without encouraging name usage; allows Claude to write naturally without excessive character naming
- July 15, 2025: Implemented dynamic name extraction system - created SectionDetailsExtractor.getExistingNamesForAvoidance() method that queries database to build real-time lists of existing names across all categories; replaced hard-coded forbidden names with dynamic extraction from section_details table ensuring accurate name avoidance based on actual book content
- July 18, 2025: Added narrative empathy requirement - every section now opens with a ~120-word illustrative anecdote that humanizes concepts and creates emotional connection before transitioning to main teaching content
- July 18, 2025: Implemented two-pass content pipeline (Claude→GPT-4.5) - after Claude generates each section draft, GPT-4o polishes content for clarity, concision, and varied syntax while preserving formatting, tone, and technical accuracy; includes robust retry logic and graceful fallback to original content
- July 18, 2025: Added comprehensive author customization system - author snippets allow custom text injection via {{AUTHOR_NOTE:identifier}} placeholders; draft variants system (configurable via DRAFT_VARIANTS env var) generates multiple versions of each section with selection guidance
- July 18, 2025: Implemented retrieval-augmented facts with SerpAPI integration - FactualResearchService provides verified snippets and URLs for enhanced content credibility; includes graceful fallback when API unavailable
- July 18, 2025: Added ToneManager for consistent persona voice across all AI models - stores sample paragraphs and persona descriptions, injects voice samples into DeepSeek and Claude prompts for unified writing style
- July 18, 2025: Integrated LanguageTool grammar checking in QA mode - post-compilation grammar scan creates annotated content with inline HTML comments; build fails if >50 critical errors detected
- July 18, 2025: Enhanced reader engagement with mandatory Action Checklists (3-5 items) and reflection questions concluding each section; FactualAccuracy service skips modifications in Action Checklist sections to preserve formatting
- July 18, 2025: Created comprehensive CLI tool (bin/forge.ts) with support for QA mode, custom variant counts, and author snippet validation; includes example specifications and complete documentation
- July 18, 2025: Enhanced security model - removed API keys from cloud environment variables, implemented local-only API key management with .env.example template, SECURITY_GUIDE.md documentation, and graceful degradation when services unavailable
- July 18, 2025: Simplified draft variants system - changed default from 2 to 1 variant per section to streamline generation process while maintaining option to generate multiple variants when needed
- July 18, 2025: Enhanced automated book generation - increased word count from 40K to 60K words and sections per chapter from 3 to 4 for comprehensive coverage (8 chapters × 4 sections = 32 sections averaging 1,875 words each)
- July 19, 2025: Updated book structure to 2 sections per chapter instead of 4 (8 chapters × 2 sections = 16 sections averaging 3,750 words each) for more focused, in-depth content while maintaining 60K total word count
- July 19, 2025: Reduced total word count from 60K to 40K words (16 sections averaging 2,500 words each) for more concise, actionable content while maintaining comprehensive coverage
- July 19, 2025: Enhanced main outline generation with extremely detailed section roadmaps - each section now includes specific content roadmaps (8-12 bullet points), opening hook strategies, learning outcomes, content flow architecture, connection points, practical applications, and section conclusions for comprehensive Claude guidance and narrative coherence
- July 18, 2025: Implemented Step 0 dynamic description optimization - uses Claude Sonnet 4 to transform base description, tone_voice, key_message, title, and subtitle into robust, verbose, Claude-optimized bookSpec descriptions that maximize effectiveness for subsequent section generation
- July 18, 2025: Updated main outline generation to use Claude Sonnet 4 instead of DeepSeek for improved consistency and quality in book structure creation
- July 19, 2025: Added standalone book rewrite page (/rewrite) - users can upload both book manuscript and review files to generate complete rewrites using Claude Sonnet 4 with 64K token limit targeting 30,000 words; creates new GitHub repository with original_book.md, book_review.md, and rewrite.md files; enhanced with optional tone/voice customization and best-seller optimization prompts that strictly follow review recommendations while maximizing commercial appeal

## User Preferences

Preferred communication style: Simple, everyday language.
Cost optimization: Switched to Claude 3.5 Sonnet for 80% cost reduction while maintaining quality.