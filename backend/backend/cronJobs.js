import cron from 'node-cron';
import axios from 'axios';
import websocketService from './services/websocketService.js';
import Scheme from './models/Scheme.js';

// Schedule scheme data sync
export const startCronJobs = () => {
  console.log('🕐 Starting cron jobs...');

  // Scrape MyScheme data every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    console.log('🔄 Running scheduled MyScheme scraping...');
    try {
      websocketService.broadcast('cron-scrape-started', {
        message: 'Scheduled MyScheme scraping started',
        timestamp: new Date().toISOString()
      });
      
      // Call our own scraping endpoint
      const response = await axios.post('http://localhost:8080/api/myscheme/scrape', {
        saveToDb: true,
        notifyClients: false // We'll notify manually to avoid double notifications
      });
      
      const result = response.data;
      console.log('✅ Scheduled scraping completed:', result);
      
      websocketService.broadcast('cron-scrape-completed', {
        message: 'Scheduled MyScheme scraping completed',
        result: {
          scraped: result.scraped,
          saved: result.saved,
          updated: result.updated,
          errors: result.errors
        },
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Scheduled scraping failed:', error.message);
      websocketService.broadcast('cron-scrape-error', {
        message: 'Scheduled MyScheme scraping failed',
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // Send stats update every 30 minutes
  cron.schedule('*/30 * * * *', async () => {
    console.log('📊 Broadcasting stats update...');
    try {
      const totalSchemes = await Scheme.countDocuments();
      const recentSchemes = await Scheme.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('name ministry sector updatedAt');
      
      websocketService.broadcast('stats-update', {
        totalSchemes,
        recentSchemes,
        lastUpdated: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Stats broadcast failed:', error.message);
    }
  });

  // Daily cleanup and maintenance
  cron.schedule('0 2 * * *', async () => {
    console.log('🧹 Running daily maintenance...');
    try {
      // Remove duplicate schemes (keep the most recent)
      const duplicates = await Scheme.aggregate([
        {
          $group: {
            _id: "$name",
            count: { $sum: 1 },
            docs: { $push: "$_id" },
            latest: { $max: "$updatedAt" }
          }
        },
        {
          $match: { count: { $gt: 1 } }
        }
      ]);

      let removedCount = 0;
      for (const duplicate of duplicates) {
        // Keep the most recent, remove others
        const toRemove = duplicate.docs.slice(0, -1);
        await Scheme.deleteMany({ _id: { $in: toRemove } });
        removedCount += toRemove.length;
      }

      // Mark old scraped schemes as inactive if they haven't been updated in 30 days
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const deactivatedCount = await Scheme.updateMany(
        { 
          source: { $in: ['api', 'dom'] },
          updatedAt: { $lt: thirtyDaysAgo },
          isActive: true
        },
        { isActive: false }
      );

      console.log(`🧹 Maintenance completed: removed ${removedCount} duplicates, deactivated ${deactivatedCount.modifiedCount} old schemes`);
      
      websocketService.broadcast('maintenance-completed', {
        message: `Daily maintenance completed`,
        removedDuplicates: removedCount,
        deactivatedSchemes: deactivatedCount.modifiedCount,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('❌ Daily maintenance failed:', error.message);
    }
  });

  console.log('✅ Cron jobs started successfully');
  console.log('   🕷️  MyScheme scraping: Every 6 hours');
  console.log('   📊 Stats update: Every 30 minutes');
  console.log('   🧹 Maintenance: Daily at 2 AM');
};

// Manual scraping function for testing
export const scrapeNow = async () => {
  console.log('🔄 Manual scraping triggered...');
  try {
    const response = await axios.post('http://localhost:8080/api/myscheme/scrape', {
      saveToDb: true,
      notifyClients: true
    });
    console.log('✅ Manual scraping completed:', response.data);
    return response.data;
  } catch (error) {
    console.error('❌ Manual scraping failed:', error.message);
    throw error;
  }
};