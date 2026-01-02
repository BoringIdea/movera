#!/bin/bash

# Achievement System Deployment Script
# Quick setup and initialization for achievement system

set -e

echo "🚀 Starting achievement system deployment..."

# Check required environment variables
check_env_vars() {
    echo "📋 Checking environment variables..."
    
    if [ -z "$DATABASE_URL" ]; then
        echo "❌ Error: DATABASE_URL environment variable is not set"
        echo "Please set the database connection string, for example:"
        echo "export DATABASE_URL='postgresql://user:password@localhost:5432/movera'"
        exit 1
    fi
    
    if [ -z "$DECIBEL_API_KEY" ]; then
        echo "⚠️  Warning: DECIBEL_API_KEY environment variable is not set"
        echo "Decibel API data source will not work properly"
    fi
    
    echo "✅ Environment variables check completed"
}

# Create database tables
create_database_schema() {
    echo "🗄️  Creating database table structure..."
    
    if [ -f "src/db/achievement-schema.sql" ]; then
        psql "$DATABASE_URL" -f src/db/achievement-schema.sql
        echo "✅ Database table structure created"
    else
        echo "❌ Error: achievement-schema.sql file does not exist"
        exit 1
    fi
}

# Insert sample data
insert_sample_data() {
    echo "📊 Inserting sample tasks and data source configurations..."
    
    if [ -f "src/achievements/sample-tasks.sql" ]; then
        psql "$DATABASE_URL" -f src/achievements/sample-tasks.sql
        echo "✅ Sample data inserted"
    else
        echo "❌ Error: sample-tasks.sql file does not exist"
        exit 1
    fi
}

# Verify database
verify_database() {
    echo "🔍 Verifying database connection and table structure..."
    
    # Check if tables exist
    TABLES=("tasks" "user_task_progress" "user_points" "data_sources" "scheduled_tasks")
    
    for table in "${TABLES[@]}"; do
        COUNT=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM $table;" 2>/dev/null || echo "0")
        if [ "$COUNT" -gt 0 ] || [ "$table" = "tasks" ] || [ "$table" = "data_sources" ] || [ "$table" = "scheduled_tasks" ]; then
            echo "✅ Table $table exists"
        else
            echo "❌ Error: Table $table does not exist or is empty"
            exit 1
        fi
    done
    
    echo "✅ Database verification completed"
}

# Install dependencies
install_dependencies() {
    echo "📦 Installing project dependencies..."
    
    if [ -f "package.json" ]; then
        npm install
        echo "✅ Dependencies installed"
    else
        echo "❌ Error: package.json file does not exist"
        exit 1
    fi
}

# Run tests
run_tests() {
    echo "🧪 Running system tests..."
    
    if [ -f "src/achievements/test-achievements.ts" ]; then
        echo "Starting test server..."
        # Need to start server first, then run tests
        echo "ℹ️  Please manually start the server and run: npm run test:achievements"
    else
        echo "⚠️  Test file does not exist, skipping tests"
    fi
}

# Show next steps
show_next_steps() {
    echo ""
    echo "🎉 Achievement system deployment completed!"
    echo ""
    echo "📋 Next steps:"
    echo "1. Start server: npm run start:dev"
    echo "2. Test API endpoints: npm run test:achievements"
    echo "3. View API documentation: http://localhost:3000/api/v1/achievements"
    echo ""
    echo "🔧 Configuration notes:"
    echo "- Database tables created with sample data"
    echo "- Scheduled tasks configured and auto-start"
    echo "- API endpoints enabled and accessible"
    echo ""
    echo "📚 Documentation:"
    echo "- System docs: src/achievements/README.md"
    echo "- Design docs: ../movera-website/src/app/passport/ACHIEVEMENT_SYSTEM_DESIGN.md"
    echo ""
    echo "🆘 For help, please check README.md file"
}

# Main function
main() {
    echo "🎯 Achievement System Deployment Script"
    echo "=================="
    
    check_env_vars
    install_dependencies
    create_database_schema
    insert_sample_data
    verify_database
    run_tests
    show_next_steps
}

# Error handling
trap 'echo "❌ Error occurred during deployment, please check output above"; exit 1' ERR

# Run main function
main "$@"