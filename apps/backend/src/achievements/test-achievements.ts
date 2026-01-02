#!/usr/bin/env ts-node

/**
 * Achievement System Test Script
 * Verify system functionality
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1/achievements';
const TEST_USER_ADDRESS = '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef';

async function testAchievementSystem() {
  console.log('🚀 Starting achievement system tests...\n');

  try {
    // 1. Test get tasks list
    console.log('1. Testing get tasks list...');
    const tasksResponse = await axios.get(`${BASE_URL}/tasks?chain=aptos`);
    console.log(`✅ Successfully retrieved ${tasksResponse.data.length} tasks`);
    console.log('Tasks list:', tasksResponse.data.map((t: any) => t.name));
    console.log('');

    // 2. Test get user task progress
    console.log('2. Testing get user task progress...');
    const progressResponse = await axios.get(`${BASE_URL}/user/${TEST_USER_ADDRESS}/tasks?chain=aptos`);
    console.log(`✅ Successfully retrieved user task progress: ${progressResponse.data.length} tasks`);
    console.log('');

    // 3. Test get user points
    console.log('3. Testing get user points...');
    const pointsResponse = await axios.get(`${BASE_URL}/user/${TEST_USER_ADDRESS}/points?chain=aptos`);
    console.log(`✅ Successfully retrieved user points: ${pointsResponse.data.totalPoints} total points`);
    console.log('');

    // 4. Test get data sources list
    console.log('4. Testing get data sources list...');
    const sourcesResponse = await axios.get(`${BASE_URL}/admin/data-sources?chain=aptos`);
    console.log(`✅ Successfully retrieved ${sourcesResponse.data.length} data sources`);
    console.log('Data sources list:', sourcesResponse.data.map((s: any) => s.source_name));
    console.log('');

    // 5. Test get scheduled tasks status
    console.log('5. Testing get scheduled tasks status...');
    const scheduledTasksResponse = await axios.get(`${BASE_URL}/admin/scheduled-tasks`);
    console.log(`✅ Successfully retrieved ${scheduledTasksResponse.data.length} scheduled tasks`);
    scheduledTasksResponse.data.forEach((task: any) => {
      console.log(`  - ${task.taskName}: ${task.isActive ? 'Active' : 'Inactive'}`);
    });
    console.log('');

    // 6. Test get user achievement stats
    console.log('6. Testing get user achievement stats...');
    const statsResponse = await axios.get(`${BASE_URL}/admin/users/${TEST_USER_ADDRESS}/stats?chain=aptos`);
    console.log(`✅ Successfully retrieved user stats:`);
    console.log(`  - Total tasks: ${statsResponse.data.totalTasks}`);
    console.log(`  - Completed tasks: ${statsResponse.data.completedTasks}`);
    console.log(`  - Completion rate: ${statsResponse.data.completionRate.toFixed(2)}%`);
    console.log(`  - Total points: ${statsResponse.data.totalPoints}`);
    console.log('');

    // 7. Test manual verify user tasks
    console.log('7. Testing manual verify user tasks...');
    const verifyResponse = await axios.post(`${BASE_URL}/admin/users/${TEST_USER_ADDRESS}/verify`, {
      chain: 'aptos',
      force_refresh: true,
      data_sources: ['database', 'api']
    });
    console.log(`✅ Manual verification completed:`);
    console.log(`  - Success: ${verifyResponse.data.success}`);
    console.log(`  - Completed tasks: ${verifyResponse.data.tasksCompleted}`);
    console.log(`  - Points earned: ${verifyResponse.data.pointsEarned}`);
    console.log('');

    console.log('🎉 All tests passed! Achievement system is working properly.');

  } catch (error: any) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response status:', error.response.status);
      console.error('Response data:', error.response.data);
    }
    process.exit(1);
  }
}

// Test data source connection
async function testDataSourceConnection() {
  console.log('\n🔗 Testing data source connections...\n');

  try {
    const sourcesResponse = await axios.get(`${BASE_URL}/admin/data-sources?chain=aptos`);
    
    for (const source of sourcesResponse.data) {
      if (source.source_type === 'api') {
        console.log(`Testing data source: ${source.source_name}...`);
        try {
          const testResponse = await axios.post(`${BASE_URL}/admin/data-sources/${source.id}/test`);
          console.log(`✅ ${source.source_name}: Connection ${testResponse.data.success ? 'successful' : 'failed'}`);
        } catch (error: any) {
          console.log(`❌ ${source.source_name}: Connection failed - ${error.message}`);
        }
      } else {
        console.log(`ℹ️  ${source.source_name}: Database type, skipping connection test`);
      }
    }
  } catch (error: any) {
    console.error('❌ Failed to test data source connections:', error.message);
  }
}

// Main function
async function main() {
  console.log('🎯 Achievement System Functionality Test\n');
  console.log('Test environment:', BASE_URL);
  console.log('Test user:', TEST_USER_ADDRESS);
  console.log('='.repeat(50));

  await testAchievementSystem();
  await testDataSourceConnection();

  console.log('\n' + '='.repeat(50));
  console.log('✨ Testing completed!');
}

// Run tests
if (require.main === module) {
  main().catch(console.error);
}

export { testAchievementSystem, testDataSourceConnection };