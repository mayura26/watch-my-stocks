import fs from 'fs';
import path from 'path';

interface ProgressItem {
  id: string;
  title: string;
  status: 'completed' | 'in-progress' | 'pending' | 'blocked';
  iteration?: number;
  notes?: string;
}

const progressItems: ProgressItem[] = [
  // Iteration 1 - Authentication & Basic Layout
  { id: 'auth-nextauth', title: 'NextAuth.js email/password authentication', status: 'completed', iteration: 1 },
  { id: 'auth-registration', title: 'User registration with first name, last name, email', status: 'completed', iteration: 1 },
  { id: 'auth-pages', title: 'Sign-in and sign-up pages', status: 'completed', iteration: 1 },
  { id: 'auth-session', title: 'Session management', status: 'completed', iteration: 1 },
  { id: 'auth-db', title: 'Database integration for authentication', status: 'completed', iteration: 1 },
  { id: 'layout-mobile', title: 'Mobile-first responsive layout', status: 'completed', iteration: 1 },
  { id: 'layout-navigation', title: 'Basic navigation with user dropdown', status: 'completed', iteration: 1 },
  { id: 'layout-asset-cards', title: 'Asset card layout with mock data', status: 'completed', iteration: 1 },
  { id: 'theme-system', title: 'Theme system (auto/light/dark) with system detection', status: 'completed', iteration: 1 },
  { id: 'theme-toggle', title: 'Theme toggle in navigation', status: 'completed', iteration: 1 },
  { id: 'theme-transitions', title: 'Smooth theme transitions', status: 'completed', iteration: 1 },
  { id: 'db-schema', title: 'Database schema for all tables', status: 'completed', iteration: 1 },
  { id: 'db-turso', title: 'Turso database integration', status: 'completed', iteration: 1 },
  { id: 'mock-data', title: 'Mock data system for testing', status: 'completed', iteration: 1 },

  // Iteration 2 - Asset Discovery & Portfolio Management (Planned)
  { id: 'asset-search', title: 'Asset search by symbol and company name', status: 'pending', iteration: 2 },
  { id: 'asset-autocomplete', title: 'Auto-completing dropdown for asset search', status: 'pending', iteration: 2 },
  { id: 'asset-validation', title: 'Asset validation against available assets', status: 'pending', iteration: 2 },
  { id: 'portfolio-add', title: 'Add assets to portfolio', status: 'pending', iteration: 2 },
  { id: 'portfolio-remove', title: 'Remove assets from portfolio', status: 'pending', iteration: 2 },
  { id: 'portfolio-management', title: 'Portfolio management UI', status: 'pending', iteration: 2 },
  { id: 'asset-categories', title: 'Asset categories (stocks, crypto, futures)', status: 'pending', iteration: 2 },
  { id: 'data-finnhub', title: 'Finnhub API integration', status: 'pending', iteration: 2 },
  { id: 'data-realtime', title: 'Real-time price updates', status: 'pending', iteration: 2 },

  // Iteration 3 - Asset Detail Views (Planned)
  { id: 'asset-detail-dialogs', title: 'Asset detail popup dialogs', status: 'pending', iteration: 3 },
  { id: 'charts-15m', title: '15-minute candlestick charts', status: 'pending', iteration: 3 },
  { id: 'charts-1d', title: '1-day candlestick charts', status: 'pending', iteration: 3 },
  { id: 'charts-data', title: 'Chart data integration', status: 'pending', iteration: 3 },
  { id: 'asset-info', title: 'Asset information display', status: 'pending', iteration: 3 },

  // Iteration 4 - Alert System (Planned)
  { id: 'alerts-price', title: 'Price threshold alerts (above/below)', status: 'pending', iteration: 4 },
  { id: 'alerts-percentage', title: 'Percentage move alerts', status: 'pending', iteration: 4 },
  { id: 'alerts-creation', title: 'Alert creation modal', status: 'pending', iteration: 4 },
  { id: 'alerts-editing', title: 'Alert editing (thresholds only)', status: 'pending', iteration: 4 },
  { id: 'alerts-toggle', title: 'Alert enable/disable toggle', status: 'pending', iteration: 4 },
  { id: 'alerts-deletion', title: 'Alert deletion', status: 'pending', iteration: 4 },
  { id: 'alerts-limit', title: '500 alerts per user limit', status: 'pending', iteration: 4 },
  { id: 'alerts-dead-bounce', title: 'Dead bounce mechanism (15min cooldown)', status: 'pending', iteration: 4 },

  // Iteration 5 - Notification System (Planned)
  { id: 'notifications-server', title: 'Server-side alert checking (cron job)', status: 'pending', iteration: 5 },
  { id: 'notifications-in-app', title: 'In-app notifications', status: 'pending', iteration: 5 },
  { id: 'notifications-permissions', title: 'Notification permissions request', status: 'pending', iteration: 5 },
  { id: 'notifications-history', title: 'Last 50 notifications display', status: 'pending', iteration: 5 },
  { id: 'notifications-cleanup', title: '30-day notification cleanup', status: 'pending', iteration: 5 },
  { id: 'notifications-read-status', title: 'Notification read/unread status', status: 'pending', iteration: 5 },

  // Iteration 6 - Alerts Page (Planned)
  { id: 'alerts-page', title: 'Alerts management page', status: 'pending', iteration: 6 },
  { id: 'alerts-list', title: 'Active alerts list', status: 'pending', iteration: 6 },
  { id: 'alerts-notifications', title: 'Notification history', status: 'pending', iteration: 6 },
  { id: 'alerts-interface', title: 'Alert editing interface', status: 'pending', iteration: 6 },
  { id: 'alerts-creation-page', title: 'Alert creation from alerts page', status: 'pending', iteration: 6 },
  { id: 'alerts-portfolio-selection', title: 'Portfolio stock selection for alerts', status: 'pending', iteration: 6 },

  // Iteration 7 - Profile & Settings (Planned)
  { id: 'profile-modal', title: 'Profile settings modal', status: 'pending', iteration: 7 },
  { id: 'profile-edit', title: 'Edit name and email', status: 'pending', iteration: 7 },
  { id: 'profile-notifications', title: 'Notification preferences', status: 'pending', iteration: 7 },
  { id: 'profile-deletion', title: 'Account deletion with password confirmation', status: 'pending', iteration: 7 },
  { id: 'profile-cleanup', title: 'Data cleanup on account deletion', status: 'pending', iteration: 7 },

  // Iteration 8 - PWA Features (Planned)
  { id: 'pwa-manifest', title: 'PWA manifest configuration', status: 'pending', iteration: 8 },
  { id: 'pwa-install', title: 'Install prompt (mobile only)', status: 'pending', iteration: 8 },
  { id: 'pwa-icon', title: 'App icon design', status: 'pending', iteration: 8 },
  { id: 'pwa-service-worker', title: 'Service worker setup', status: 'pending', iteration: 8 },
  { id: 'pwa-offline', title: 'Offline detection', status: 'pending', iteration: 8 },

  // Iteration 9 - Data Integration (Planned)
  { id: 'data-polygon', title: 'Polygon.io API integration (backup)', status: 'pending', iteration: 9 },
  { id: 'data-yahoo', title: 'yahoo-finance2 integration (backup)', status: 'pending', iteration: 9 },
  { id: 'data-modular', title: 'Modular data layer', status: 'pending', iteration: 9 },
  { id: 'data-rate-limiting', title: 'Rate limiting', status: 'pending', iteration: 9 },
  { id: 'data-caching', title: 'Data caching', status: 'pending', iteration: 9 },

  // Iteration 10 - Docker & Deployment (Planned)
  { id: 'docker-containerization', title: 'Docker containerization', status: 'pending', iteration: 10 },
  { id: 'docker-cron', title: 'Cron job containers', status: 'pending', iteration: 10 },
  { id: 'docker-env', title: 'Environment configuration', status: 'pending', iteration: 10 },
  { id: 'docker-production', title: 'Production deployment', status: 'pending', iteration: 10 },
];

function calculateProgress() {
  const completed = progressItems.filter(item => item.status === 'completed').length;
  const total = progressItems.length;
  const percentage = Math.round((completed / total) * 100);
  
  return { completed, total, percentage };
}

function generateProgressReport() {
  const { completed, total, percentage } = calculateProgress();
  
  const report = `# Progress Report - ${new Date().toLocaleDateString()}

## 📊 Overall Progress: ${percentage}% Complete

- **Completed**: ${completed}/${total} features
- **In Progress**: ${progressItems.filter(item => item.status === 'in-progress').length} features
- **Pending**: ${progressItems.filter(item => item.status === 'pending').length} features
- **Blocked**: ${progressItems.filter(item => item.status === 'blocked').length} features

## 🎯 Current Iteration Status

${Object.entries(
  progressItems
    .filter(item => item.iteration)
    .reduce((acc, item) => {
      if (!acc[item.iteration!]) {
        acc[item.iteration!] = [];
      }
      acc[item.iteration!].push(item);
      return acc;
    }, {} as Record<number, ProgressItem[]>)
).map(([iteration, items]) => {
  const completed = items.filter(item => item.status === 'completed').length;
  const total = items.length;
  const percentage = Math.round((completed / total) * 100);
  
  return `### Iteration ${iteration}: ${percentage}% Complete (${completed}/${total})
${items.map(item => `- [${item.status === 'completed' ? 'x' : ' '}] ${item.title}`).join('\n')}`;
}).join('\n\n')}

## 📝 Next Steps

${progressItems
  .filter(item => item.status === 'pending')
  .slice(0, 5)
  .map(item => `- ${item.title}`)
  .join('\n')}

---

*Generated on ${new Date().toLocaleString()}*
`;

  return report;
}

function main() {
  try {
    const report = generateProgressReport();
    
    // Write to progress report file
    fs.writeFileSync('PROGRESS_REPORT.md', report);
    
    // Update implementation status
    const statusContent = fs.readFileSync('IMPLEMENTATION_STATUS.md', 'utf8');
    const updatedStatus = statusContent.replace(
      /## 🎯 Overall Progress: \d+% Complete/,
      `## 🎯 Overall Progress: ${calculateProgress().percentage}% Complete`
    );
    fs.writeFileSync('IMPLEMENTATION_STATUS.md', updatedStatus);
    
    console.log('Progress updated successfully!');
    console.log(`Overall progress: ${calculateProgress().percentage}%`);
  } catch (error) {
    console.error('Error updating progress:', error);
    process.exit(1);
  }
}

main();
