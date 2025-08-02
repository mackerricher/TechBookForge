import { BookGeneratorService } from './server/services/bookGenerator.js';
import { storage } from './server/storage.js';

async function debugWorkflow() {
  console.log('🐛 Debugging workflow issue...');
  
  const bookId = 26;
  
  try {
    // Check if chapters and sections exist
    const chapters = await storage.getBookChapters(bookId);
    console.log('📚 Chapters found:', chapters.length);
    
    for (const chapter of chapters) {
      const sections = await storage.getChapterSections(chapter.id);
      console.log(`📖 Chapter ${chapter.chapterNumber}: ${sections.length} sections`);
    }
    
    // Try to create chapters and sections manually
    const bookGenerator = new BookGeneratorService();
    const bookSpec = {
      chapter_count: 2,
      sections_per_chapter: 2
    };
    
    console.log('🏗️ Creating chapter and section entries...');
    await bookGenerator.createChapterAndSectionEntries(bookId, bookSpec);
    
    // Check again after creation
    const chaptersAfter = await storage.getBookChapters(bookId);
    console.log('📚 Chapters after creation:', chaptersAfter.length);
    
    for (const chapter of chaptersAfter) {
      const sections = await storage.getChapterSections(chapter.id);
      console.log(`📖 Chapter ${chapter.chapterNumber}: ${sections.length} sections`);
    }
    
    console.log('✅ Chapter and section creation successful');
    
  } catch (error) {
    console.error('❌ Error in workflow:', error);
    console.error('Stack:', error.stack);
  }
}

debugWorkflow();