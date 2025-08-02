#!/usr/bin/env node

import { program } from 'commander';
import { BookGeneratorService } from '../server/services/bookGenerator';
import fs from 'fs';

program
  .name('forge')
  .description('TechBookForge CLI - Generate books with AI')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate a book from specification')
  .argument('<spec-file>', 'JSON specification file')
  .option('--qa', 'Enable quality assurance mode with grammar checking')
  .option('--variants <count>', 'Number of draft variants to generate (default: 1)', '1')
  .action(async (specFile, options) => {
    try {
      // Set environment variables
      if (options.qa) {
        process.env.QA_MODE = 'true';
        console.log('🔍 QA mode enabled - grammar checking will be performed');
      }
      
      if (options.variants) {
        process.env.DRAFT_VARIANTS = options.variants;
        console.log(`🎯 Generating ${options.variants} draft variants per section`);
      }

      // Read and parse specification file
      if (!fs.existsSync(specFile)) {
        console.error(`❌ Specification file not found: ${specFile}`);
        process.exit(1);
      }

      const spec = JSON.parse(fs.readFileSync(specFile, 'utf8'));
      
      // Validate author snippets if present
      if (spec.author_snippets) {
        console.log(`📝 Found ${Object.keys(spec.author_snippets).length} author snippets`);
        Object.keys(spec.author_snippets).forEach(key => {
          console.log(`   - ${key}: ${spec.author_snippets[key].substring(0, 50)}...`);
        });
      }
      
      const generator = new BookGeneratorService();
      const bookId = await generator.generateBook(spec);
      
      console.log(`✅ Book generated successfully with ID: ${bookId}`);
      
      if (options.variants && parseInt(options.variants) > 1) {
        console.log(`📚 Each section generated with ${options.variants} variants - check the *_variants_README.md files for instructions`);
      }
      
    } catch (error) {
      console.error('❌ Generation failed:', error);
      process.exit(1);
    }
  });

program.parse();